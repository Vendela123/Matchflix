# MatchFlix System Overview

## Architecture at a Glance

MatchFlix is a full-stack web application built on Next.js with a PostgreSQL backend via Supabase. It is deployed on Vercel.

**Client Layer:** Next.js client components (React) render the quiz, session management, and recommendation display. Real-time updates flow through Supabase subscriptions.

**Server Layer:** Next.js server actions and API routes handle session creation, quiz submission, match logic, and TMDb API calls. All business logic lives here.

**Database Layer:** Supabase PostgreSQL stores users, sessions, and quiz responses. Real-time subscriptions keep the client in sync.

**External Integration:** TMDb API provides movie metadata, genres, ratings, and streaming platform availability.

## The User Journey

1. **Create or Join:** One user generates a match session and receives a shareable link. Others join via that link using a nickname.

2. **Answer the Quiz:** Each person answers questions about their movie preferences (genres, mood, runtime, language, streaming availability).

3. **Real-Time Sync:** As responses arrive, all users in the session see real-time updates. When everyone has answered, the client signals readiness.

4. **Compute Recommendation:** A server action scores all movies in the database against the combined preferences, selecting the best match.

5. **Display and Share:** The recommendation page shows the movie, TMDb metadata, streaming platform info, and allows sharing.

## Data Model

**match_sessions** table holds the session record: UUID, created timestamp, any session-level settings.

**users** table (scoped to sessions) stores nicknames and session membership.

**quiz_responses** table stores each user's answers: user_id, session_id, genre preferences, mood, runtime tolerance, language, and streaming platform filters.

**movies** cache (optional, could be ephemeral) stores recently queried TMDb results to reduce API calls.

## The Match Algorithm

The algorithm is deterministic and stateless. Given a set of quiz responses from all session participants:

1. Load all quiz responses for the session.
2. Iterate through the movie database (queried from TMDb or cached locally).
3. For each movie, calculate an overlap score across all users:
   - Genre match: Does the movie's genres overlap with all users' preferred genres?
   - Mood compatibility: Does the mood tag (if present) match stated preferences?
   - Runtime: Is the movie within all users' tolerance windows?
   - Language: Does it match all users' language preferences?
4. Return the movie with the highest aggregate score (or top 3 for a shortlist).

The goal is maximum agreement, not compromise. A movie that delights everyone ranks higher than one that pleases most.

## Real-Time Behavior

When a user submits a quiz response, a server action:

1. Validates and stores the response in `quiz_responses`.
2. Checks if all session participants have now answered.
3. If yes, broadcasts a `session_ready` event via Supabase subscriptions.
4. The client receives the event and shows a "compute recommendation" button or auto-triggers the match.

When recommendation is computed, a `recommendation_ready` event broadcasts the result to all clients in the session.

## Security Model

No authentication is required. Access control is based on session links:
- Session IDs are long, random, and non-sequential, making enumeration infeasible.
- Knowing the session ID is equivalent to having an invitation.
- Quiz responses are stored per session, never linked to persistent user accounts.

TMDb API credentials are never exposed to the client; all calls are server-side.

## Scaling Considerations

Initial load is light: small groups (2–10 users) creating sessions on demand. Sessions are ephemeral and can be archived after 30 days. Quiz response volume is low per session. Movie metadata is cached from TMDb to reduce API calls. Concurrent load grows with simultaneous session activity, not per-user frequency. Supabase's baseline capacity handles typical SaaS load; scale planning should monitor session creation rates and concurrent quiz answering during peak hours.

## Deployment

Vercel hosts the Next.js application, serving both client and server. Environment variables hold the Supabase connection string and TMDb API key. Database migrations are applied via Supabase's SQL editor or migration tools. CI/CD via GitHub Actions runs tests and deploys to Vercel on main branch pushes.