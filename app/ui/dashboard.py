"""Frontend redirect notice. The system uses a dedicated Next.js CRM frontend in the `frontend/` directory."""

if __name__ == "__main__":
    print(
        "CreatorFlow AI uses Next.js as its primary CRM frontend.\n"
        "To launch the frontend:\n"
        "  1. Start FastAPI backend:  python main.py api --port 8000\n"
        "  2. Start Next.js frontend: cd frontend && npm run dev\n"
        "  3. Open http://localhost:3000 in your browser."
    )
