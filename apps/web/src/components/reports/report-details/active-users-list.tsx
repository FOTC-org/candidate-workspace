import type { ActiveUserDto } from "@/types";

export interface ActiveUsersListProps {
  users: ActiveUserDto[];
}

export function ActiveUsersList({
  users,
}: ActiveUsersListProps): React.JSX.Element {
  const hasIdentities = users.some((u) => u.email !== undefined);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-sm font-medium text-gray-700">
        Most active users
      </h2>
      {users.length === 0 ? (
        <p className="text-sm text-gray-500">No active users in this range.</p>
      ) : (
        <ol className="space-y-2">
          {users.map((user, index) => (
            <li
              key={user.userId ?? index}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-900">
                {hasIdentities ? user.email : `User #${index + 1}`}
              </span>
              <span className="text-sm text-gray-500">
                {user.analysisCount} analyses
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
