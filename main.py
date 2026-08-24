"""CLI entrypoint for EDXSO Automated Micro-Influencer Outreach System."""

import sys
import argparse
import subprocess

# Ensure UTF-8 output encoding across Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.config.settings import get_settings
from app.pipeline.orchestrator import PipelineOrchestrator
from app.utils.logging import get_logger, console

logger = get_logger("cli")


def prompt_user_niche() -> str:
    """Display an interactive niche selection prompt on the terminal."""
    console.print("\n[bold cyan]Select Target Technology Niche for Micro-Influencer Discovery:[/bold cyan]")
    niches = [
        "All Technology (Broad)",
        "Artificial Intelligence & LLMs",
        "Programming & Software Engineering",
        "Developer Tools & DevOps",
        "Cybersecurity & Infosec",
        "Machine Learning & Data Science",
        "Gadgets & Tech Reviews",
        "Custom Keyword / Query",
    ]
    for idx, n in enumerate(niches, start=1):
        console.print(f"  [bold yellow][{idx}][/bold yellow] {n}")

    try:
        choice = input("\nEnter choice [1-8] (default: 1): ").strip()
        if not choice or choice == "1":
            return "all"
        elif choice == "2":
            return "Artificial Intelligence"
        elif choice == "3":
            return "Programming"
        elif choice == "4":
            return "DevOps"
        elif choice == "5":
            return "Cybersecurity"
        elif choice == "6":
            return "Machine Learning"
        elif choice == "7":
            return "Gadgets"
        elif choice == "8":
            custom = input("Enter custom niche / technology keyword: ").strip()
            return custom if custom else "all"
        else:
            return "all"
    except (KeyboardInterrupt, EOFError):
        return "all"


def main():
    """Main CLI command handler."""
    parser = argparse.ArgumentParser(
        description="EDXSO Automated Micro-Influencer Outreach System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # Full Pipeline
    pipeline_parser = subparsers.add_parser("pipeline", help="Run full end-to-end outreach pipeline")
    pipeline_parser.add_argument(
        "--target",
        type=int,
        default=85,
        help="Target number of candidate creators to discover (default: 85)",
    )
    pipeline_parser.add_argument(
        "--mode",
        choices=["simulation", "smtp"],
        default=None,
        help="Outreach mode (default: from .env or 'simulation')",
    )
    pipeline_parser.add_argument(
        "--niche",
        type=str,
        default=None,
        help="Target technology niche (e.g. 'Artificial Intelligence', 'Programming', 'DevOps', 'Cybersecurity', 'all')",
    )
    pipeline_parser.add_argument(
        "--wipe", "--clear",
        action="store_true",
        help="Wipe previous database records and raw cache before running fresh pipeline",
    )
    pipeline_parser.add_argument(
        "-i", "--interactive",
        action="store_true",
        help="Prompt interactively to choose target niche before execution",
    )

    # Discover
    discover_parser = subparsers.add_parser("discover", help="Stage 1: Discover real YouTube tech creators")
    discover_parser.add_argument(
        "--target",
        type=int,
        default=85,
        help="Target candidate channels count",
    )
    discover_parser.add_argument(
        "--niche",
        type=str,
        default=None,
        help="Target technology niche",
    )

    # Filter & Enrich
    filter_parser = subparsers.add_parser("filter", help="Stage 2: Filter and classify discovered creators")
    filter_parser.add_argument(
        "--niche",
        type=str,
        default=None,
        help="Filter creators matching specific niche",
    )

    # Personalize
    personalize_parser = subparsers.add_parser("personalize", help="Stage 4: Generate LLM personalizations via Groq")
    personalize_parser.add_argument(
        "--niche",
        type=str,
        default=None,
        help="Personalize only creators matching specific niche",
    )

    # Outreach
    outreach_parser = subparsers.add_parser("outreach", help="Stage 5: Execute outreach simulation or SMTP delivery")
    outreach_parser.add_argument(
        "--mode",
        choices=["simulation", "smtp"],
        default="simulation",
        help="Outreach execution mode",
    )

    # Export
    subparsers.add_parser("export", help="Export processed data to CSV files in data/exports/")

    # FastAPI REST Server
    api_parser = subparsers.add_parser("api", help="Launch FastAPI REST backend server for Next.js CRM on port 8000")
    api_parser.add_argument("--port", type=int, default=8000, help="Port to bind server (default: 8000)")
    api_parser.add_argument("--host", type=str, default="127.0.0.1", help="Host interface (default: 127.0.0.1)")

    # Interactive shortcut
    subparsers.add_parser("interactive", help="Interactively configure and run the pipeline")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    orchestrator = PipelineOrchestrator()

    # Determine target niche: if not provided via --niche, ask user directly
    target_niche = getattr(args, "niche", None)
    no_prompt = getattr(args, "no_prompt", False)

    if target_niche is None and not no_prompt and args.command in ("pipeline", "discover", "interactive"):
        if sys.stdin.isatty():
            target_niche = prompt_user_niche()

    try:
        if getattr(args, "wipe", False):
            orchestrator.clear_database()
            console.print("[bold yellow]Previous database records and caches wiped for fresh run.[/bold yellow]")

        if args.command in ("pipeline", "interactive"):
            orchestrator.run_full_pipeline(
                target_count=getattr(args, "target", 85),
                outreach_mode=getattr(args, "mode", None),
                target_niche=target_niche,
            )
        elif args.command == "discover":
            creators = orchestrator.discover_and_collect(target_count=args.target, custom_niche=target_niche)
            console.print(f"[bold green]Discovery complete. {len(creators)} creators saved to raw cache.[/bold green]")
        elif args.command == "filter":
            influencers = orchestrator.filter_and_enrich_channels(target_niche=target_niche)
            console.print(f"[bold green]Filtering & enrichment complete. {len(influencers)} influencers in database.[/bold green]")
        elif args.command == "personalize":
            messages = orchestrator.personalize_qualified(target_niche=target_niche)
            console.print(f"[bold green]Personalization complete. {len(messages)} messages generated.[/bold green]")
        elif args.command == "outreach":
            results = orchestrator.execute_outreach(mode=args.mode)
            console.print(f"[bold green]Outreach completed: {results}[/bold green]")
        elif args.command == "export":
            exports = orchestrator.export_csvs()
            console.print(f"[bold green]Exports created:[/bold green]\n{exports}")
        elif args.command == "api":
            console.print(f"[bold cyan]Launching CreatorFlow AI FastAPI Backend on http://{args.host}:{args.port}...[/bold cyan]")
            import uvicorn
            uvicorn.run("app.api.server:app", host=args.host, port=args.port, reload=True)
    except Exception as e:
        logger.exception(f"Command execution error: {e}")
        console.print(f"[bold red]Error executing command '{args.command}': {e}[/bold red]")
        sys.exit(1)


if __name__ == "__main__":
    main()
