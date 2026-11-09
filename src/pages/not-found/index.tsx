import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="page">
      <div className="state-box">
        <h2>Sahifa topilmadi</h2>
        <p>Bunday bo'lim yo'q.</p>
        <Link className="btn btn-primary" to="/trips">
          Reyslarga o'tish
        </Link>
      </div>
    </section>
  );
}
