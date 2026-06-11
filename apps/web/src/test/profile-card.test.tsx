import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProfileCard } from "../components/core/profile-card";
import type { UserDto } from "../types";

const makeUser = (overrides: Partial<UserDto> = {}): UserDto => ({
  id: "user-1",
  email: "test@example.com",
  role: "ANALYST",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("ProfileCard", () => {
  it("renders user email and role", () => {
    render(<ProfileCard user={makeUser()} />);

    expect(screen.getByText("test@example.com")).toBeDefined();
    expect(screen.getByText("ANALYST")).toBeDefined();
  });

  it("shows Active badge for active user", () => {
    render(<ProfileCard user={makeUser({ isActive: true })} />);

    expect(screen.getByText("Active")).toBeDefined();
  });

  it("shows Inactive badge for inactive user", () => {
    render(<ProfileCard user={makeUser({ isActive: false })} />);

    expect(screen.getByText("Inactive")).toBeDefined();
  });

  it("renders ADMIN role badge", () => {
    render(<ProfileCard user={makeUser({ role: "ADMIN" })} />);

    expect(screen.getByText("ADMIN")).toBeDefined();
  });
});
