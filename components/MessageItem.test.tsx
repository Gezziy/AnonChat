import React from "react";
import { render, screen } from "@testing-library/react";
import { MessageItem } from "./MessageItem";

const baseMessage = {
  id: "m1",
  text: "Hello",
  sender: "wallet_abc",
  timestamp: new Date("2025-01-01T10:00:00Z"),
  isOwn: true,
  isEncrypted: false,
};

describe("MessageItem", () => {
  it("renders Edited label when message is edited", () => {
    render(<MessageItem message={{ ...baseMessage, editedAt: new Date("2025-01-01T10:01:00Z") }} />);
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("Edited")).toBeDefined();
  });

  it("does not render Edited label when message is not edited", () => {
    render(<MessageItem message={{ ...baseMessage, editedAt: undefined }} />);
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.queryByText("Edited")).toBeNull();
  });
});