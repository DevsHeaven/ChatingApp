const UserRow = ({ user, onAddFriend }) => {
  const renderAction = () => {
    if (!user.relationship) {
      return (
        <button className="btn btn-primary btn-sm" onClick={() => onAddFriend(user)}>
          Add friend
        </button>
      );
    }
    if (user.relationship.status === "accepted") {
      return <span className="pill pill-success">Friends</span>;
    }
    return (
      <span className="pill pill-neutral">
        {user.relationship.requestedByMe ? "Request sent" : "Wants to be friends"}
      </span>
    );
  };

  return (
    <div className="list-row">
      <div className="avatar">{user.username?.[0]?.toUpperCase() || "?"}</div>
      <div className="list-row-body">
        <div className="list-row-title">{user.username}</div>
      </div>
      {renderAction()}
    </div>
  );
};

export default UserRow;
