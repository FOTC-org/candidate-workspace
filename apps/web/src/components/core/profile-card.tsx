import type { UserDto } from "@/types";

export interface ProfileCardProps {
  user: UserDto;
}

export function ProfileCard({ user }: ProfileCardProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <dl className="space-y-3">
        <div className="flex justify-between">
          <dt className="text-sm font-medium text-gray-500">Email</dt>
          <dd className="text-sm text-gray-900">{user.email}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm font-medium text-gray-500">Role</dt>
          <dd>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {user.role}
            </span>
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm font-medium text-gray-500">Status</dt>
          <dd>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {user.isActive ? "Active" : "Inactive"}
            </span>
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm font-medium text-gray-500">Member since</dt>
          <dd className="text-sm text-gray-900">
            {new Date(user.createdAt).toLocaleDateString("en-CA")}
          </dd>
        </div>
      </dl>
    </div>
  );
}
