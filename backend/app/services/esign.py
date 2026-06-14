"""Vendor-neutral e-signing adapter.

A document is "sent for signature" through a SigningAdapter. V1 ships a stub
adapter that performs no external call — it mints a deterministic-looking
envelope id and returns it, so the full UX (send → track → mark signed) works
end-to-end without a paid provider. A real provider (DocuSign, or a Saudi-local
e-sign service) implements the same interface and is selected via settings,
with no change to callers or the database schema.

This keeps signing optional and replaceable per CLAUDE.md Rule 6/9.
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Signer:
    name: str
    email: str


@dataclass(frozen=True)
class SigningResult:
    provider: str
    envelope_id: str


class SigningAdapter(ABC):
    name: str

    @abstractmethod
    def send_for_signature(self, document_name: str, signers: list[Signer]) -> SigningResult:
        """Create a signing envelope and return its provider reference."""
        ...


class StubSigningAdapter(SigningAdapter):
    """No-op provider. Generates an audit-traceable envelope id; sends nothing.

    Lets the platform record and track signing intent before a real e-sign
    contract is in place. Never claim a document was actually delivered.
    """

    name = "stub"

    def send_for_signature(self, document_name: str, signers: list[Signer]) -> SigningResult:
        # Envelope id is prefixed so it is obviously a stub in audit logs.
        return SigningResult(provider=self.name, envelope_id=f"stub-{uuid.uuid4()}")


def get_signing_adapter() -> SigningAdapter:
    """Return the configured adapter. Stub until a real provider is wired in."""
    return StubSigningAdapter()
