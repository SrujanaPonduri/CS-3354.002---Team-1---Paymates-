# mock_db.py
# Responsible for: defining the in-memory database (DB dict), a unique-ID
# generator, and a seed() function that pre-populates demo data on import.

import uuid
import time


def new_id() -> str:
    """Return a new UUID4 string."""
    return str(uuid.uuid4())


def adjust_budget_spent(home_id: str, category: str, amount_delta: float) -> None:
    """Apply a spending delta to matching budgets for a home/category."""
    if not home_id or not category:
        return

    normalized_category = category.strip().lower()
    if not normalized_category:
        return

    try:
        delta = float(amount_delta)
    except (TypeError, ValueError):
        return

    for budget in DB["budgets"].values():
        if budget.get("home_id") != home_id:
            continue
        if (budget.get("category") or "").strip().lower() != normalized_category:
            continue
        current = float(budget.get("current_balance", 0.0) or 0.0)
        budget["current_balance"] = round(max(0.0, current + delta), 2)


# ---------------------------------------------------------------------------
# In-memory database
# ---------------------------------------------------------------------------

DB: dict = {
    # ------------------------------------------------------------------
    # users — one record per registered Paymates user
    # ------------------------------------------------------------------
    # {
    #   id         : str  — unique user ID (UUID or "u1" / "u2" / "u3" for seeds)
    #   email      : str  — user's email address (must be unique)
    #   name       : str  — display name entered during account setup
    #   phone      : str  — phone number (optional, entered during setup)
    #   address    : str  — street address (optional, entered during setup)
    #   home_ids   : list — IDs of all homes the user belongs to
    #   created_at : float — Unix timestamp of account creation
    # }
    "users": {},

    # ------------------------------------------------------------------
    # tokens — short-lived magic-link tokens (one-time use)
    # ------------------------------------------------------------------
    # {
    #   <token_string>: {
    #     email      : str   — the email address this token was issued for
    #     expires_at : float — Unix timestamp after which the token is invalid
    #   }
    # }
    "tokens": {},

    # ------------------------------------------------------------------
    # homes — a shared living space with one or more roommates
    # ------------------------------------------------------------------
    # {
    #   id              : str  — unique home ID
    #   name            : str  — friendly name for the home (e.g. "Maple Street House")
    #   address         : str  — physical street address of the home
    #   roommate_ids    : list — IDs of users who currently live in this home
    #   creator_id      : str  — user ID of whoever created this home
    #   deletion_votes  : list — user IDs who have voted to delete this home;
    #                            home is deleted when len == len(roommate_ids)
    # }
    "homes": {},

    # ------------------------------------------------------------------
    # invites — pending roommate invitation tokens
    # ------------------------------------------------------------------
    # {
    #   <invite_token>: {
    #     email      : str   — email address of the person being invited
    #     home_id    : str   — ID of the home the invite is for
    #     invited_by : str   — user ID of the person who sent the invite
    #     expires_at : float — Unix timestamp after which the invite is invalid
    #   }
    # }
    "invites": {},

    # ------------------------------------------------------------------
    # bills — itemized bills (groceries, utilities, etc.) split among roommates
    # ------------------------------------------------------------------
    # {
    #   id                 : str   — unique bill ID
    #   title              : str   — short description (e.g. "HEB Grocery Run")
    #   date               : str   — ISO date string of when the bill was incurred
    #   category           : str   — bill category (e.g. "Groceries", "Utilities")
    #   split_type         : str   — "evenly" | "by_item" | "fixed_amount"
    #   items              : list  — line items: [{ name, quantity, unit_price, owner_ids }]
    #   tax                : float — tax amount added on top of item subtotal
    #   total              : float — calculated total (subtotal + tax)
    #   assigned_roommates : list  — user IDs who share this bill
    #   receipt_url        : str   — URL / path to receipt image (FR-14, simulated)
    #   created_by         : str   — user ID of whoever created the bill
    #   home_id            : str   — ID of the home this bill belongs to
    # }
    "bills": {},

    # ------------------------------------------------------------------
    # dues — individual payment obligations (one per user per bill/expense)
    # ------------------------------------------------------------------
    # {
    #   id                : str   — unique due ID
    #   expense_id_or_bill_id : str — ID of the parent bill or expense
    #   user_id           : str   — ID of the user who owes this amount
    #   amount            : float — amount owed in USD
    #   due_date          : str   — ISO date string of when payment is expected
    #   status            : str   — "pending" | "done"
    # }
    "dues": {},

    # ------------------------------------------------------------------
    # expenses — recurring or one-time shared expenses (rent, Netflix, etc.)
    # ------------------------------------------------------------------
    # {
    #   id            : str   — unique expense ID
    #   title         : str   — short description (e.g. "Monthly Rent")
    #   amount        : float — total amount of the expense
    #   expense_type  : str   — "one_time" | "recurring"
    #   frequency     : str   — "monthly" | "weekly" | "yearly" (if recurring)
    #   start_date    : str   — ISO date string of the first occurrence
    #   next_due_date : str   — ISO date string of the next payment (if recurring)
    #   assigned_to   : list  — user IDs who share this expense
    #   creator_id    : str   — user ID of whoever created the expense
    #   home_id       : str   — ID of the home this expense belongs to
    # }
    "expenses": {},

    # ------------------------------------------------------------------
    # items — shared inventory items tracked in the home
    # ------------------------------------------------------------------
    # {
    #   id           : str   — unique item ID
    #   name         : str   — item name (e.g. "Whole Milk")
    #   category     : str   — item category (e.g. "Groceries", "Furniture")
    #   quantity     : float — how many / how much of the item is available
    #   unit_price   : float — price per unit in USD
    #   owners       : list  — user IDs who claim ownership of this item
    #   home_id      : str   — ID of the home this item belongs to
    #   purchased_on : str   — ISO date string of when the item was purchased
    # }
    "items": {},
    "budgets": {},
}


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

def seed():
    """Pre-populate the in-memory DB with demo data for development/testing."""

    # --- Home ---
    DB["homes"]["home-demo"] = {
        "id": "home-demo",
        "name": "Maple Street House",
        "address": "123 Maple Street, Dallas, TX 75201",
        "roommate_ids": ["u1", "u2", "u3"],
        "creator_id": "u1",
        "deletion_votes": [],
    }

    # --- Users ---
    now = time.time()
    DB["users"]["u1"] = {
        "id": "u1",
        "email": "aagam@example.com",
        "name": "Aagam",
        "phone": "555-0001",
        "address": "123 Maple Street, Dallas, TX 75201",
        "home_ids": ["home-demo"],
        "created_at": now,
    }
    DB["users"]["u2"] = {
        "id": "u2",
        "email": "joseph@example.com",
        "name": "Joseph",
        "phone": "555-0002",
        "address": "123 Maple Street, Dallas, TX 75201",
        "home_ids": ["home-demo"],
        "created_at": now,
    }
    DB["users"]["u3"] = {
        "id": "u3",
        "email": "srujana@example.com",
        "name": "Srujana",
        "phone": "555-0003",
        "address": "123 Maple Street, Dallas, TX 75201",
        "home_ids": ["home-demo"],
        "created_at": now,
    }

    # --- Items ---
    DB["items"]["item-1"] = {
        "id": "item-1",
        "name": "Whole Milk",
        "category": "Groceries",
        "quantity": 2,
        "unit_price": 3.49,
        "owners": ["u1"],
        "home_id": "home-demo",
        "purchased_on": "2025-04-01",
    }
    DB["items"]["item-2"] = {
        "id": "item-2",
        "name": "IKEA Desk Chair",
        "category": "Furniture",
        "quantity": 1,
        "unit_price": 129.99,
        "owners": ["u1"],
        "home_id": "home-demo",
        "purchased_on": "2025-03-15",
    }
    DB["items"]["item-3"] = {
        "id": "item-3",
        "name": "Dish Soap",
        "category": "Supplies",
        "quantity": 3,
        "unit_price": 2.99,
        "owners": ["u1"],
        "home_id": "home-demo",
        "purchased_on": "2025-04-03",
    }


    # --- Demo bill (for Dues page demo) ---
    DB["bills"]["bill-demo"] = {
        "id":                 "bill-demo",
        "title":              "April Groceries",
        "date":               "2025-04-01",
        "category":           "Groceries",
        "split_type":         "evenly",
        "items":              [{"name": "Weekly shop", "quantity": 1, "unit_price": 90.00, "owner_ids": []}],
        "tax":                0,
        "total":              90.00,
        "assigned_roommates": ["u1", "u2", "u3"],
        "receipt_url":        None,
        "created_by":         "u1",
        "home_id":            "home-demo",
    }

    # --- Dues from that bill (FR-15 seed data) ---
    DB["dues"]["due-1"] = {
        "id":                     "due-1",
        "expense_id_or_bill_id":  "bill-demo",
        "user_id":                "u1",
        "amount":                 30.00,
        "due_date":               "2025-04-10",
        "status":                 "done",     # u1 already paid
    }
    DB["dues"]["due-2"] = {
        "id":                     "due-2",
        "expense_id_or_bill_id":  "bill-demo",
        "user_id":                "u2",
        "amount":                 30.00,
        "due_date":               "2025-04-10",
        "status":                 "pending",
    }
    DB["dues"]["due-3"] = {
        "id":                     "due-3",
        "expense_id_or_bill_id":  "bill-demo",
        "user_id":                "u3",
        "amount":                 30.00,
        "due_date":               "2025-04-10",
        "status":                 "pending",
    }
    # --- Demo Budget (UC-11 seed data) ---
    DB["budgets"]["budget-1"] = {
        "id": "budget-1",
        "home_id": "home-demo",
        "category": "Groceries",
        "limit": 500.0,
        "current_balance": 90.0,
        "visibility": "all"
    }


seed()
