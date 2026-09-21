export default function ChatLog({ messages }) {
  return (
    <div className="chat-log">
      {messages.map((msg, idx) => (
        <div className="chat-message" key={idx}>
          <span className="chat-avatar" aria-hidden="true" />
          <p>{msg}</p>
        </div>
      ))}
    </div>
  );
}
