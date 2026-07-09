import ExpiryBadge from "./ExpiryBadge.jsx";

const RequestRow = ({ entry, direction, onAccept, onCancel }) => {
  return (
    <div className="list-row">
      <div className="avatar">{entry.user.username[0]?.toUpperCase()}</div>
      <div className="list-row-body">
        <div className="list-row-title">{entry.user.username}</div>
        <ExpiryBadge createdAt={entry.createdAt} />
      </div>
      {direction === "incoming" ? (
        <div className="row-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onAccept(entry)}>
            Accept
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onCancel(entry)}>
            Reject
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => onCancel(entry)}>
          Cancel
        </button>
      )}
    </div>
  );
};

export default RequestRow;
