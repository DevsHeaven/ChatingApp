import { useEffect, useState } from "react";

const TTL_HOURS = 72;

const getTimeLeft = (createdAt) => {
  const expiresAt = new Date(createdAt).getTime() + TTL_HOURS * 60 * 60 * 1000;
  const diffMs = expiresAt - Date.now();
  if (diffMs <= 0) return "expiring…";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m left`;
};

// Small live countdown - purely informational; the real deletion happens
// server-side via MongoDB TTL indexes regardless of whether anyone is watching.
const ExpiryBadge = ({ createdAt }) => {
  const [label, setLabel] = useState(() => getTimeLeft(createdAt));

  useEffect(() => {
    const interval = setInterval(() => setLabel(getTimeLeft(createdAt)), 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return <span className="expiry-badge">{label}</span>;
};

export default ExpiryBadge;
