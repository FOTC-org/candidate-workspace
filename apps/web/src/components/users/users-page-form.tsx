"use client";

import * as React from "react";
import type { PaginatedUsersDto } from "@/types";
import { UsersDataTable } from "./table/users-data-table";

export interface UsersPageFormProps {
  initialData: PaginatedUsersDto;
  accessToken: string;
}

export function UsersPageForm({
  initialData,
  accessToken,
}: UsersPageFormProps): React.JSX.Element {
  const [data, setData] = React.useState<PaginatedUsersDto>(initialData);

  if (data.items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
        <p className="text-gray-500">No users found.</p>
      </div>
    );
  }

  return (
    <UsersDataTable
      rows={data.items}
      total={data.total}
      page={data.page}
      limit={data.limit}
      accessToken={accessToken}
      onDataChange={setData}
    />
  );
}
