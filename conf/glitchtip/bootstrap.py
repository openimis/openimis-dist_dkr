"""Bootstrap GlitchTip for openIMIS: superuser, org, team, projects, DSNs.

Runs inside the GlitchTip image via `./manage.py shell < bootstrap.py`, so it
talks to the ORM directly — no docker socket, no `docker exec`.

Idempotent: re-running reuses the existing org/team/projects and only refreshes
the DSN files, so it is safe to leave the initializer in the compose stack.
"""
from __future__ import annotations

import os
import re
from pathlib import Path

from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify

OUT = Path(os.environ.get("GLITCHTIP_OUT_DIR", "/out"))
EMAIL = os.environ.get("GLITCHTIP_SUPERUSER_EMAIL", "admin@openimis.org")
PASSWORD = os.environ.get("GLITCHTIP_SUPERUSER_PASSWORD", "change_me_in_production")
ORG_SLUG = os.environ.get("GLITCHTIP_ORG_SLUG", "openimis")
ORG_NAME = os.environ.get("GLITCHTIP_ORG_NAME", "OpenIMIS")

# Host used in the DSNs handed to the instrumented apps. GLITCHTIP_DOMAIN
# already drives ProjectKey.get_dsn(); these allow overriding it per audience.
HOST_GLITCHTIP = (
    os.environ.get("GLITCHTIP_PUBLIC_HOST")
    or os.environ.get("GLITCHTIP_DOMAIN")
    or "http://localhost/logs"
)
# Browsers and mobile devices always go through the public host; only the
# server-side backend may prefer an in-network route (defaults to public).
INTERNAL_GLITCHTIP = os.environ.get("GLITCHTIP_INTERNAL_HOST") or HOST_GLITCHTIP

# (slug, name, platform, dsn file stem, .env variable name)
# Project.slug is an AutoSlugField populated from the name on insert, so these
# slugs mirror what GlitchTip generates rather than overriding it.
PROJECTS = [
    ("openimis-frontend", "OpenIMIS Frontend", "javascript-react", "fe", "REACT_APP_SENTRY_DSN"),
    ("openimis-backend", "OpenIMIS Backend", "python-django", "be", "SENTRY_DSN_BACKEND"),
    ("openimis-mobile", "OpenIMIS Mobile", "android", "mobile", "SENTRY_DSN_MOBILE"),
]
# Projects whose events are emitted server-side, from inside the compose network.
INTERNAL_STEMS = {"be"}


def _rewrite_dsn_host(dsn: str, base: str) -> str:
    """Swap the scheme+authority of a DSN, keeping its key and project id."""
    if "://" not in dsn or "@" not in dsn:
        return dsn
    scheme, rest = dsn.split("://", 1)
    key, after_at = rest.split("@", 1)
    project_id = after_at.rstrip("/").rsplit("/", 1)[-1] if after_at else ""
    base = base.rstrip("/")
    if "://" in base:
        base_scheme, base_authority = base.split("://", 1)
    else:
        base_scheme, base_authority = scheme, base
    return f"{base_scheme}://{key}@{base_authority}/{project_id}"


def _get_or_create_project(Project, org, slug: str, name: str, platform: str):
    """Find an existing project by slug or name before creating one.

    Project.slug is an AutoSlugField, so a project created through the UI may
    carry a slugified name (or a `-1` suffix) instead of our slug. Matching on
    those first keeps re-runs from piling up duplicates.
    """
    project = Project.objects.filter(organization=org, slug=slug).first()
    if project:
        return project, False
    project = Project.objects.filter(organization=org, name=name).first()
    if project:
        return project, False
    base = slugify(name) or slug
    project = Project.objects.filter(organization=org, slug=base).first()
    if project:
        return project, False
    numbered = (
        Project.objects.filter(organization=org, slug__regex=rf"^{re.escape(base)}(-\d+)?$")
        .order_by("id")
        .first()
    )
    if numbered:
        return numbered, False
    return (
        Project.objects.create(organization=org, slug=slug, name=name, platform=platform),
        True,
    )


def main() -> None:
    User = get_user_model()
    Organization = apps.get_model("organizations_ext", "Organization")
    OrganizationUser = apps.get_model("organizations_ext", "OrganizationUser")
    OrganizationOwner = apps.get_model("organizations_ext", "OrganizationOwner")
    Team = apps.get_model("teams", "Team")
    Project = apps.get_model("projects", "Project")
    ProjectKey = apps.get_model("projects", "ProjectKey")

    OUT.mkdir(parents=True, exist_ok=True)
    dsn_lines: list[str] = []

    with transaction.atomic():
        user, created = User.objects.get_or_create(
            email=EMAIL,
            defaults={"is_staff": True, "is_superuser": True},
        )
        user.set_password(PASSWORD)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print(f"superuser {'created' if created else 'updated'}: {EMAIL}")

        org, org_created = Organization.objects.get_or_create(
            slug=ORG_SLUG, defaults={"name": ORG_NAME}
        )
        print(f"org {'created' if org_created else 'exists'}: {org.slug}")

        # role 3 = OrganizationUserRole.OWNER
        org_user, _ = OrganizationUser.objects.update_or_create(
            organization=org,
            user=user,
            defaults={"role": 3, "email": user.email},
        )
        OrganizationOwner.objects.get_or_create(
            organization=org, organization_user=org_user
        )

        team, _ = Team.objects.get_or_create(organization=org, slug=ORG_SLUG)
        team.members.add(org_user)

        org.is_accepting_events = True
        org.open_membership = True
        org.save()

        for slug, name, platform, stem, env_key in PROJECTS:
            project, project_created = _get_or_create_project(
                Project, org, slug, name, platform
            )
            print(
                f"{'created' if project_created else 'reusing'} project "
                f"id={project.id} slug={project.slug}"
            )
            # Team.projects is M2M — without it the project is invisible in the UI
            team.projects.add(project)

            key = ProjectKey.objects.filter(project=project).first()
            if key is None:
                key = ProjectKey.objects.create(project=project, name="Default")
                print(f"  created project key for {project.slug}")

            dsn = key.get_dsn()
            public_dsn = _rewrite_dsn_host(dsn, HOST_GLITCHTIP)
            internal_dsn = _rewrite_dsn_host(dsn, INTERNAL_GLITCHTIP)

            (OUT / f"public-dsn.{stem}.txt").write_text(public_dsn + "\n", encoding="utf-8")
            (OUT / f"public-dsn.{stem}.internal.txt").write_text(
                internal_dsn + "\n", encoding="utf-8"
            )
            print(f"  public DSN:   {public_dsn}")

            dsn_lines.append(
                f"{env_key}={internal_dsn if stem in INTERNAL_STEMS else public_dsn}"
            )

            if stem == "fe":
                # Back-compat name used by earlier versions of this initializer
                (OUT / "public-dsn.txt").write_text(public_dsn + "\n", encoding="utf-8")

        (OUT / "dsn.env").write_text("\n".join(dsn_lines) + "\n", encoding="utf-8")


main()
