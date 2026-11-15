# Backend

Node.js 20+ and Express 5 API. Admin login uses MySQL credentials, scrypt password hashes, and one-hour HS256 JWTs.

1. Copy `.env.example` to `.env` and set the MySQL connection, a JWT secret with at least 32 characters, the bootstrap admin ID/password, and Cloudinary credentials.
2. Create the MySQL database named by `DB_NAME`.
3. Run `npm install`, `npm run db:migrate`, and `npm run db:seed-admin`.
4. Run `npm run dev`.

The login endpoint is `POST /api/v1/auth/login` with `{ "id": "...", "password": "..." }`. Protected endpoints use `Authorization: Bearer <token>`; `GET /api/v1/admin/me` verifies the admin middleware.

`GET /api/v1/categories`, `/api/v1/genders`, `/api/v1/states`, `/api/v1/union-territories`, `/api/v1/locations`, and `/api/v1/ministries` are public. The combined locations endpoint returns `{ locations: [{ id, name, isUnionTerritory, isActive, createdAt, updatedAt }] }`. Admin JWTs are required for `POST`, `PATCH`, and `DELETE` on categories, genders, states, union territories, and ministries. Create or update categories using `multipart/form-data` with `name`, `description`, and an optional `image` file (JPEG, PNG, or WebP; up to 5 MB). Images are uploaded to Cloudinary; the database stores the secure URL and Cloudinary public ID. Categories, genders, states, union territories, and ministries have an `isActive` flag and created/updated timestamps. Migrations seed `male`, `female`, `other`, all 28 Indian states, all 8 union territories, and the 53 Union Government ministries listed in the [Government of India directory](https://igod.gov.in/ug/categories). A master value in use cannot be deleted once a scheme foreign key references it.

Each schema change belongs in a new ordered `.sql` file under `migrations/`. The migration runner records applied filenames in `schema_migrations`. The admin ID and password are supplied through server-only environment variables and seeded as a scrypt hash; do not put real credentials in a migration or commit `.env`.
