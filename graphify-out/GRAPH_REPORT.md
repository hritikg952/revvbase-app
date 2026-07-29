# Graph Report - .  (2026-07-29)

## Corpus Check
- 46 files · ~54,659 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 102 nodes · 95 edges · 27 communities (19 shown, 8 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Foundation Planning|Foundation Planning]]
- [[_COMMUNITY_OTP Auth API|OTP Auth API]]
- [[_COMMUNITY_Database Models and Alembic|Database Models and Alembic]]
- [[_COMMUNITY_App Database Runtime|App Database Runtime]]
- [[_COMMUNITY_Product and Stack|Product and Stack]]
- [[_COMMUNITY_External Integration Flows|External Integration Flows]]
- [[_COMMUNITY_Auth Roadmap|Auth Roadmap]]
- [[_COMMUNITY_Marketplace Feature Roadmap|Marketplace Feature Roadmap]]
- [[_COMMUNITY_JWT Dependency Stub|JWT Dependency Stub]]
- [[_COMMUNITY_Upload Signature Stub|Upload Signature Stub]]
- [[_COMMUNITY_GSD Workflow|GSD Workflow]]
- [[_COMMUNITY_Listing Schema Stub|Listing Schema Stub]]
- [[_COMMUNITY_User Schema Stub|User Schema Stub]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Architecture Patterns|Architecture Patterns]]
- [[_COMMUNITY_Deferred V2 Features|Deferred V2 Features]]

## God Nodes (most connected - your core abstractions)
1. `verify_otp()` - 4 edges
2. `get_settings()` - 4 edges
3. `Phase 2 Authentication` - 4 edges
4. `Phase 4 Browse and Detail` - 4 edges
5. `Migration 001 Marketplace Schema` - 4 edges
6. `Signed Direct Image Upload` - 4 edges
7. `send_otp()` - 3 edges
8. `OTPSendRequest` - 3 edges
9. `OTPVerifyRequest` - 3 edges
10. `TokenResponse` - 3 edges

## Surprising Connections (you probably didn't know these)
- `GSD Workflow Enforcement` --semantically_similar_to--> `GSD Workflow Enforcement`  [INFERRED] [semantically similar]
  AGENTS.md → CLAUDE.md
- `Backend Runtime Dependency Set` --implements--> `Recommended Revvbase Technology Stack`  [INFERRED]
  backend/requirements.txt → .planning/research/STACK.md
- `send_otp()` --calls--> `get_settings()`  [INFERRED]
  backend/app/auth/routes.py → backend/app/config.py
- `verify_otp()` --calls--> `TokenResponse`  [INFERRED]
  backend/app/auth/routes.py → backend/app/auth/schemas.py
- `verify_otp()` --calls--> `get_settings()`  [INFERRED]
  backend/app/auth/routes.py → backend/app/config.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Five-Phase Delivery Sequence** — planning_roadmap_phase_1_foundation, planning_roadmap_phase_2_authentication, planning_roadmap_phase_3_listing_creation, planning_roadmap_phase_4_browse_detail, planning_roadmap_phase_5_seller_management [EXTRACTED 1.00]
- **Foundation Execution Set** — planning_phases_01_foundation_01_01_plan_backend_foundation, planning_phases_01_foundation_01_02_plan_integration_services, planning_phases_01_foundation_01_03_plan_frontend_scaffold [EXTRACTED 1.00]
- **Scalable Listing Delivery Pattern** — planning_research_architecture_signed_direct_image_upload, planning_research_architecture_keyset_feed, planning_research_architecture_jsonb_vehicle_attributes, planning_research_pitfalls_feed_performance_controls [INFERRED 0.85]

## Communities (27 total, 8 thin omitted)

### Community 0 - "Foundation Planning"
Cohesion: 0.15
Nodes (14): Backend Foundation Plan, Expo Frontend Scaffold Plan, Auth Guard Bottom Sheet, Domain-Driven Frontend Backend Monorepo, Migration 001 Marketplace Schema, Context-Driven Swappable Theme, Selected Foundation Options Audit Trail, Backend Dependency Injection Pattern (+6 more)

### Community 1 - "OTP Auth API"
Cohesion: 0.27
Nodes (9): send_otp(), verify_otp(), OTPSendRequest, OTPVerifyRequest, TokenResponse, get_settings(), Settings, BaseModel (+1 more)

### Community 2 - "Database Models and Alembic"
Cohesion: 0.25
Nodes (6): Alembic env.py — GeoAlchemy2-aware (PATTERNS Pattern 5).  Without alembic_helper, User, Listing, ListingPhoto, VehicleMake, SQLModel

### Community 4 - "Product and Stack"
Cohesion: 0.29
Nodes (7): Backend Runtime Dependency Set, Five-Minute Frictionless Listing, Low-Complexity MVP Stack, Mobile-First Native App, Revvbase, Thin Supply-Demand MVP Loop, Recommended Revvbase Technology Stack

### Community 5 - "External Integration Flows"
Cohesion: 0.33
Nodes (7): Cloudinary and MSG91 Integration Services Plan, Mockable OTP Service, Keyset-Paginated Listing Feed, Layered Marketplace Architecture, OTP Authentication Flow, Signed Direct Image Upload, Accumulated Architectural Invariants

### Community 6 - "Auth Roadmap"
Cohesion: 0.29
Nodes (7): V1 Authentication Requirements, OTP Bombing Risk, Refresh Token Cycle, Project Research Synthesis, Phase 1 Foundation, Phase 2 Authentication, Current Foundation Focus

### Community 7 - "Marketplace Feature Roadmap"
Cohesion: 0.33
Nodes (7): V1 Browse and Detail Requirements, V1 Listing Requirements, V1 Seller Management Requirements, Feed Performance Controls, Phase 3 Listing Creation, Phase 4 Browse and Detail, Phase 5 Seller Management

### Community 8 - "JWT Dependency Stub"
Cohesion: 0.50
Nodes (3): get_current_user(), Phase 1: stub. Phase 2: validate JWT, return User from DB., HTTPAuthorizationCredentials

## Knowledge Gaps
- **8 isolated node(s):** `revvbase-backend`, `V1 Browse and Detail Requirements`, `V1 Seller Management Requirements`, `Deferred V2 Capabilities`, `Current Foundation Focus` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Project Research Synthesis` connect `Auth Roadmap` to `Foundation Planning`, `External Integration Flows`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `Phase 2 Authentication` connect `Auth Roadmap` to `Marketplace Feature Roadmap`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `verify_otp()` (e.g. with `TokenResponse` and `get_settings()`) actually correct?**
  _`verify_otp()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `get_settings()` (e.g. with `send_otp()` and `verify_otp()`) actually correct?**
  _`get_settings()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Alembic env.py — GeoAlchemy2-aware (PATTERNS Pattern 5).  Without alembic_helper`, `Phase 1: stub. Phase 2: validate JWT, return User from DB.`, `Phase 1: stub. Listing request/response schemas land in Phase 3.` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._