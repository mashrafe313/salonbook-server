# SalonBook - Server

SalonBook Server is the backend REST API for the SalonBook salon appointment booking platform. It handles authentication, authorization, service management, appointment management, user management, image uploads, and transaction records.

## Technology Stack

- Node.js
- Express.js
- TypeScript
- MongoDB
- Better Auth
- JWT Authentication and Authorization
- ImgBB
- REST API

## Main Features

- RESTful API architecture
- Authentication and authorization
- Server-side role-based access control
- Service creation, updating, deletion, and status management
- Appointment booking and management
- Appointment status updates
- Customer management
- User blocking and unblocking
- Dashboard statistics
- Transaction management
- Demo payment processing (simulated transactions only)
- Authenticated image upload using ImgBB
- Request validation and error handling
- Protected API routes

**Payment Note:** The current implementation uses a demo payment workflow. It records simulated transactions and does not process real payments. Stripe Checkout Session creation and verified Stripe webhook handling are not yet implemented.

## Environment Variables

Create a `.env` file in the server project root:

```env
PORT=
CLIENT_URL=
MONGODB_URI=
DB_NAME=
BETTER_AUTH_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
IMGBB_API_KEY=
```

Never commit `.env` files or secret credentials to GitHub.

## Installation

Clone the repository:

```bash
git clone https://github.com/Mashrafe313/salonbook-server.git
```

Navigate to the project directory:

```bash
cd