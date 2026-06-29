import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsersDataTable } from "../components/users/table/users-data-table";
import type { UserDto, PaginatedUsersDto } from "../types";

vi.mock("../lib/api/client", () => ({
  deactivateUserApi: vi.fn(),
  getUsersApi: vi.fn(),
}));

import { deactivateUserApi, getUsersApi } from "../lib/api/client";

const makeUser = (overrides: Partial<UserDto> = {}): UserDto => ({
  id: "user-1",
  email: "test@example.com",
  role: "ANALYST",
  isActive: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...overrides,
});

describe("UsersDataTable", () => {
  const defaultProps = {
    rows: [makeUser()],
    total: 1,
    page: 1,
    limit: 20,
    accessToken: "token",
    onDataChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user rows", () => {
    render(<UsersDataTable {...defaultProps} />);

    expect(screen.getByText("test@example.com")).toBeDefined();
    expect(screen.getByText("ANALYST")).toBeDefined();
    expect(screen.getByText("Active")).toBeDefined();
  });

  it("shows Deactivate button for active users", () => {
    render(<UsersDataTable {...defaultProps} />);

    expect(screen.getByRole("button", { name: /deactivate/i })).toBeDefined();
  });

  it("does not show Deactivate button for inactive users", () => {
    const inactiveUser = makeUser({ isActive: false });
    render(<UsersDataTable {...defaultProps} rows={[inactiveUser]} />);

    expect(screen.queryByRole("button", { name: /deactivate/i })).toBeNull();
  });

  it("shows Inactive badge for inactive users", () => {
    const inactiveUser = makeUser({ isActive: false });
    render(<UsersDataTable {...defaultProps} rows={[inactiveUser]} />);

    expect(screen.getByText("Inactive")).toBeDefined();
  });

  it("calls deactivateUserApi and refreshes data on deactivate", async () => {
    const updatedData: PaginatedUsersDto = {
      items: [makeUser({ isActive: false })],
      total: 1,
      page: 1,
      limit: 20,
    };

    vi.mocked(deactivateUserApi).mockResolvedValue(
      makeUser({ isActive: false }),
    );
    vi.mocked(getUsersApi).mockResolvedValue(updatedData);

    render(<UsersDataTable {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /deactivate/i }));

    await waitFor(() => {
      expect(deactivateUserApi).toHaveBeenCalledWith("token", "user-1");
      expect(defaultProps.onDataChange).toHaveBeenCalledWith(updatedData);
    });
  });

  it("renders empty table rows correctly for multiple users", () => {
    const rows = [
      makeUser({ id: "user-1", email: "a@a.com", role: "ADMIN" }),
      makeUser({
        id: "user-2",
        email: "b@b.com",
        role: "MANAGER",
        isActive: false,
      }),
    ];
    render(<UsersDataTable {...defaultProps} rows={rows} total={2} />);

    expect(screen.getByText("a@a.com")).toBeDefined();
    expect(screen.getByText("b@b.com")).toBeDefined();
    expect(screen.getByText("ADMIN")).toBeDefined();
    expect(screen.getByText("MANAGER")).toBeDefined();
  });

  it("hides pagination when total <= limit", () => {
    render(<UsersDataTable {...defaultProps} total={5} limit={20} />);

    expect(screen.queryByRole("button", { name: /previous/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
  });

  it("shows pagination when total > limit", () => {
    render(<UsersDataTable {...defaultProps} total={50} limit={20} />);

    expect(screen.getByRole("button", { name: /previous/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /next/i })).toBeDefined();
  });
});
