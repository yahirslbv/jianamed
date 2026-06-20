import styles from '../styles/App.module.css';

export default function CategoryCard({ category, onSelect }) {
  return (
    <button className={styles.categoryCard} type="button" onClick={() => onSelect(category.name)}>
      <span className={styles.categoryIcon} aria-hidden="true">
        {category.label}
      </span>
      <span className={styles.categoryTitle}>{category.name}</span>
      <span className={styles.categoryDescription}>{category.description}</span>
    </button>
  );
}
