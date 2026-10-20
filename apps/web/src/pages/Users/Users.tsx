import { FC } from "react";

import clsx from "clsx";

import styles from "./Users.module.scss";

import { useGetUsersQuery } from "@services/cachedAPI";

import Skeleton from "@shared/Skeleton";

interface UsersProps {
  className?: string;
}

const Users: FC<UsersProps> = ({ className = "" }) => {
  const { data: users, isLoading, isError } = useGetUsersQuery();

  return (
    <>
      <title>Users | App</title>
      <meta name="description" content="Browse the registered users." />
      <div className={clsx(styles.root, className, "card-wrap")} data-testid="users">
        <h2>Users</h2>

        {isLoading && <Skeleton number={3} height={24} width="100%" />}
        {isError && <p className="alert">Could not load users.</p>}

        {users?.length === 0 && <p>No users yet.</p>}

        {users && users.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default Users;
