export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>🧠 QuizSphere — test your knowledge, climb the leaderboard.</div>
        <div>© {year} QuizSphere. All rights reserved.</div>
      </div>
    </footer>
  );
}
