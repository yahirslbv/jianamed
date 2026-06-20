import styles from '../styles/App.module.css';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export default function NewsCard({ item }) {
  return (
    <article className={styles.newsCard}>
      <time dateTime={item.date}>{dateFormatter.format(new Date(`${item.date}T12:00:00`))}</time>
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      <a href="#noticias">Leer más</a>
    </article>
  );
}
