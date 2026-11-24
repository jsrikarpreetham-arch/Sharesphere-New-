
import { Link } from 'react-router-dom';
import { ArrowRight, Tags } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useCategories } from '../lib/categories';
import { useAsync } from '../lib/hooks';
import { num } from '../lib/format';
import { Card, CardSkeletons, EmptyState, ErrorState, Notice, PageHeader } from '../components/ui';

export default function Categories() {
  const { user } = useAuth();

  const categories = useAsync(api.categories);
  const donations = useAsync(api.donations);
  const requests = useAsync(api.myRequests, [], user?.role === 'RECIPIENT');

  const cats = useCategories(categories.data);

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Browse what’s being shared, grouped by category."
      />

      <div style={{ marginBottom: 18 }}>
        <Notice title="Showing all available categories">
          Categories are loaded directly from the database. Some categories may
          not have donations yet.
        </Notice>
      </div>

      {categories.loading || donations.loading ? (
        <CardSkeletons count={4} />
      ) : categories.error ? (
        <ErrorState
          message={categories.error}
          onRetry={categories.reload}
        />
      ) : donations.error ? (
        <ErrorState
          message={donations.error}
          onRetry={donations.reload}
        />
      ) : cats.length === 0 ? (
        <EmptyState
          icon={<Tags size={26} />}
          title="No categories to show yet"
          text="Categories will appear here when they are added to the database."
        />
      ) : (
        <div className="grid">
          {cats.map((c) => {
            const items = (donations.data || []).filter(
              (d) => d.category_id === c.category_id
            );

            const open = items.filter(
              (d) =>
                ['AVAILABLE', 'PARTIAL'].includes(d.status) &&
                num(d.available_quantity) > 0
            ).length;

            const reqs = (requests.data || []).filter(
              (r) =>
                r.category_id === c.category_id &&
                !['CANCELLED', 'FULFILLED'].includes(r.status)
            ).length;

            return (
              <Card key={c.category_id} className="item card-hover">
                <div className="category-image-wrap">
  <img
    className="category-image"
    src={
  c.category_name.toLowerCase().includes('food')
    ? '/images/categories/food.jpg'
    : c.category_name.toLowerCase().includes('book')
    ? '/images/categories/book.jpg'
    : c.category_name.toLowerCase().includes('clothing')
    ? '/images/categories/clothing.jpg'
    : c.category_name.toLowerCase().includes('electronic')
    ? '/images/categories/electronics.jpg'
    : c.category_name.toLowerCase().includes('furniture')
    ? '/images/categories/furniture.jpg'
    : c.category_name.toLowerCase().includes('household')
    ? '/images/categories/household.jpg'
    : c.category_name.toLowerCase().includes('medical')
    ? '/images/categories/medical.jpg'
    : ''
}
    alt={c.category_name}
    onError={(e) => {
      e.currentTarget.style.display = 'none';
    }}
  />
</div>
                <h3>{c.category_name}</h3>

                {c.description && (
                  <p className="meta">{c.description}</p>
                )}

                <div className="meta" style={{ margin: '10px 0 16px' }}>
                  <div>
                    <strong style={{ color: 'var(--text)' }}>{open}</strong>
                    {' '}available donation{open === 1 ? '' : 's'}
                    {' · '}{items.length} total
                  </div>

                  {user?.role === 'RECIPIENT' && (
                    <div>
                      <strong style={{ color: 'var(--text)' }}>{reqs}</strong>
                      {' '}of your open request{reqs === 1 ? '' : 's'}
                    </div>
                  )}
                </div>

                <div className="item-actions">
                  <Link
                    className="btn btn-secondary btn-sm"
                    to={`/app/donations?category=${c.category_id}`}
                  >
                    Browse donations <ArrowRight size={14} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
