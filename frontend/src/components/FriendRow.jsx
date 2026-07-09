import { useNavigate } from "react-router-dom";
import ExpiryBadge from "./ExpiryBadge.jsx";

const FriendRow = ({ entry, onRemove }) => {
  const navigate = useNavigate();

  return (
    <div className="list-row list-row-clickable" onClick={() => navigate(`/chat/${entry.user.id}`)}>
      <div className="avatar">{entry.user.username[0]?.toUpperCase()}</div>
      <div className="list-row-body">
        <div className="list-row-title">{entry.user.username}</div>
        <ExpiryBadge createdAt={entry.createdAt} />
      </div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(entry);
        }}
      >
        Remove
      </button>
    </div>
  );
};

export default FriendRow;
