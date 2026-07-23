import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActiveUsersList } from "../components/reports/report-details/active-users-list";
import type { ActiveUserDto } from "../types";

describe("ActiveUsersList", () => {
  it("renders an empty state when there are no active users", () => {
    render(<ActiveUsersList users={[]} />);

    expect(screen.getByText("No active users in this range.")).toBeDefined();
  });

  it("renders email and analysis count for ADMIN/MANAGER shaped data", () => {
    const users: ActiveUserDto[] = [
      { userId: "user-1", email: "a@a.com", analysisCount: 5 },
      { userId: "user-2", email: "b@b.com", analysisCount: 3 },
    ];
    render(<ActiveUsersList users={users} />);

    expect(screen.getByText("a@a.com")).toBeDefined();
    expect(screen.getByText("b@b.com")).toBeDefined();
    expect(screen.getByText("5 analyses")).toBeDefined();
  });

  it("renders anonymized positions instead of identities for ANALYST shaped data", () => {
    const users: ActiveUserDto[] = [
      { analysisCount: 5 },
      { analysisCount: 3 },
    ];
    render(<ActiveUsersList users={users} />);

    expect(screen.getByText("User #1")).toBeDefined();
    expect(screen.getByText("User #2")).toBeDefined();
    expect(screen.queryByText("a@a.com")).toBeNull();
  });
});
