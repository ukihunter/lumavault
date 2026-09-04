# LumaVault

> A lightweight, self-hosted personal media streaming platform built for your home network.

LumaVault is a private Netflix-style media server designed to run on a local machine and stream your personal movie and TV collection to PCs, phones, tablets, and compatible TVs over the local network.

The goal is to keep the system **simple, lightweight, fast, and completely under your control** — no cloud infrastructure or external streaming service is required for local playback.

---

## Features

### Media Library

* Movies
* TV series
* Seasons and episodes
* Recently added media
* Search and filtering
* Movie and series details
* Posters and thumbnails

### Video Playback

* Browser-based video player
* HTTP range-based video streaming
* Seeking through large video files
* Fullscreen playback
* Resume playback
* Watch progress tracking
* Direct playback without server-side transcoding

### Netflix-Style Interface

* Cinematic home page
* Featured media
* Continue Watching
* Recently Added
* Movie collections
* Series collections
* Responsive design
* Desktop, mobile, and TV-friendly layouts

### Self-Hosted

* Runs on your own hardware
* Works entirely inside your home network
* No Internet connection required for local playback
* Media remains on your own storage
* Designed to run on low-powered hardware

---

## Architecture

```text
                    HOME NETWORK
                         │
          ┌──────────────┼──────────────┐
          │              │              │
         PC            Phone            TV
          │              │              │
          └──────────────┼──────────────┘
                         │
                    LAN / Wi-Fi
                         │
                ┌────────▼────────┐
                │    LumaVault    │
                │                 │
                │    Next.js      │
                │    TypeScript   │
                │    Prisma       │
                │    SQLite       │
                │                 │
                │  Video Streaming│
                └────────┬────────┘
                         │
                    Local Files
                         │
                ┌────────▼────────┐
                │  Media Storage  │
                │                 │
                │    Movies       │
                │    Series       │
                │    Episodes     │
                └─────────────────┘
```

LumaVault is designed around **direct playback**.

Instead of transcoding video on the server:

```text
Movie File
    │
    ▼
LumaVault
    │
    │ HTTP Range Streaming
    ▼
PC / Phone / TV
    │
    ▼
Device decodes video
```

This significantly reduces CPU requirements and makes the application suitable for low-powered home servers.

---

## Technology Stack

| Technology   | Purpose                 |
| ------------ | ----------------------- |
| Next.js      | Web application and API |
| TypeScript   | Application language    |
| React        | User interface          |
| Tailwind CSS | Styling                 |
| shadcn/ui    | UI components           |
| Prisma       | Database ORM            |
| SQLite       | Local metadata database |
| Node.js      | Runtime                 |
| Arch Linux   | Server operating system |
| Git          | Version control         |

---

## Project Structure

```text
lumavault/
│
├── app/
│   ├── (home)/
│   │   ├── movies/
│   │   ├── series/
│   │   ├── search/
│   │   ├── library/
│   │   └── watch/
│   │
│   ├── admin/
│   │   ├── movies/
│   │   ├── series/
│   │   └── library/
│   │
│   ├── api/
│   │   ├── movies/
│   │   ├── series/
│   │   ├── episodes/
│   │   ├── videos/
│   │   ├── progress/
│   │   ├── search/
│   │   └── library/
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── home/
│   ├── movie/
│   ├── series/
│   ├── player/
│   ├── search/
│   └── admin/
│
├── lib/
│   ├── db/
│   ├── media/
│   ├── metadata/
│   └── validation/
│
├── prisma/
│   └── schema.prisma
│
├── types/
│
├── data/
│   ├── posters/
│   ├── backdrops/
│   └── thumbnails/
│
├── media/
│
├── public/
│   ├── images/
│   └── icons/
│
├── scripts/
├── tests/
├── config/
│
├── .env
├── .env.example
├── .gitignore
└── README.md
```

---

## Media Storage

Media files are kept outside the application database.

Recommended server layout:

```text
/srv/lumavault/

├── media/
│   ├── movies/
│   │   ├── Movie Name/
│   │   │   └── movie.mkv
│   │   └── ...
│   │
│   └── series/
│       ├── Series Name/
│       │   ├── Season 01/
│       │   │   ├── S01E01.mkv
│       │   │   └── S01E02.mkv
│       │   └── Season 02/
│       │
│       └── ...
│
└── app/
    └── lumavault/
```

The database stores metadata and file paths.

The actual video files remain on the filesystem.

---

## Database

LumaVault uses SQLite for local metadata.

The database stores information such as:

```text
Movie
├── title
├── description
├── year
├── poster
├── backdrop
├── filePath
└── metadata

Series
├── title
├── description
├── poster
└── metadata

Season
├── number
├── title
└── series

Episode
├── number
├── title
├── description
├── thumbnail
├── filePath
└── season

Progress
├── episode
├── position
└── completed
```

Video files are **not stored inside SQLite**.

---

## Video Streaming

LumaVault uses HTTP Range Requests to stream media files.

Example:

```http
GET /api/videos/:episodeId
Range: bytes=5000000-
```

The server responds with partial content:

```http
HTTP/1.1 206 Partial Content
Accept-Ranges: bytes
Content-Range: bytes 5000000-9999999/500000000
Content-Length: 5000000
```

This allows the browser to:

* Start playback quickly
* Seek through the video
* Request only required portions
* Avoid loading the entire file into memory

---

## Local Network

LumaVault is designed primarily for local network usage.

Example:

```text
LumaVault Server
192.168.1.50:3000
```

Devices connected to the same network can access:

```text
http://192.168.1.50:3000
```

Example:

```text
PC       ─────┐
Phone     ────┤
Tablet    ────┼──► Router ───► LumaVault
TV        ────┤
              ┘
```

Local playback does not require Internet bandwidth.

The network traffic remains inside the home LAN.

---

## Hardware Target

LumaVault is intentionally designed to work on modest hardware.

Example target:

```text
CPU:      Intel Celeron
RAM:      4 GB
OS:       Arch Linux
Storage:  HDD / SSD
Network:  Ethernet or Wi-Fi
```

The server is optimized for **direct playback** rather than CPU-intensive transcoding.

### Recommended

```text
Server
   │
   ├── Ethernet
   │
   ▼
Router
   │
   ├── Wi-Fi → Phone
   ├── Wi-Fi → TV
   └── Ethernet → PC
```

Ethernet is preferred for the server when possible.

---

## Installation

### Clone the repository

```bash
git clone <repository-url>
cd lumavault
```

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Configure the local database and media directory.

Example:

```env
DATABASE_URL="file:./dev.db"

MEDIA_ROOT="/srv/lumavault/media"
```

### Generate Prisma Client

```bash
npx prisma generate
```

### Run database migrations

```bash
npx prisma migrate dev
```

### Start development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Development

Run the development server:

```bash
npm run dev
```

Run TypeScript checks:

```bash
npx tsc --noEmit
```

Run linting:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

Start production server:

```bash
npm start
```

---

## Library Scanner

LumaVault will include a media scanner capable of discovering files from the configured media directory.

Example:

```text
/srv/lumavault/media/
        │
        ▼
     Scanner
        │
        ├── Movies
        ├── Series
        ├── Seasons
        └── Episodes
        │
        ▼
      SQLite
```

The scanner should be idempotent so repeatedly scanning the library does not create duplicate records.

---

## Roadmap

### Phase 1 — Foundation

* [ ] Next.js application
* [ ] SQLite database
* [ ] Prisma schema
* [ ] Base layout
* [ ] Navigation
* [ ] Responsive design

### Phase 2 — Media Library

* [ ] Movie model
* [ ] Series model
* [ ] Season model
* [ ] Episode model
* [ ] Filesystem scanner
* [ ] Library management

### Phase 3 — Streaming

* [ ] Video API
* [ ] HTTP Range Requests
* [ ] HTML5 video player
* [ ] Seeking
* [ ] Fullscreen
* [ ] Error handling

### Phase 4 — Netflix-Style UI

* [ ] Hero section
* [ ] Movie cards
* [ ] Series cards
* [ ] Continue Watching
* [ ] Recently Added
* [ ] Search
* [ ] Movie details
* [ ] Series details
* [ ] Season selector
* [ ] Episode browser

### Phase 5 — Personalization

* [ ] Watch history
* [ ] Resume playback
* [ ] Episode completion
* [ ] Favorites
* [ ] Collections

### Phase 6 — Device Support

* [ ] Mobile optimization
* [ ] PWA
* [ ] TV-friendly interface
* [ ] Keyboard navigation
* [ ] Remote-control friendly navigation

### Future

* [ ] Subtitle support
* [ ] Multiple audio tracks
* [ ] Automatic metadata
* [ ] Poster generation
* [ ] Thumbnail generation
* [ ] Hardware transcoding
* [ ] Multiple users
* [ ] Remote access
* [ ] HTTPS
* [ ] Automatic library scanning

---

## Design Goals

LumaVault follows a few core principles:

### Lightweight

The server should consume as few resources as reasonably possible.

### Local First

The application should continue working when the Internet is unavailable.

### Direct Playback

Avoid unnecessary transcoding and processing.

### Simple Architecture

Prefer simple, maintainable solutions over unnecessary infrastructure.

### Device Agnostic

The same application should work across:

* Desktop
* Mobile
* Tablet
* TV

### Privacy

Media and watch history remain on the user's own server.

---

## Security

The initial version is intended for trusted home networks.

If remote access is added later, additional security measures will be required, including:

* Authentication
* Authorization
* HTTPS
* Secure session management
* Rate limiting
* Input validation
* Path traversal protection
* Media access controls
* Secure reverse proxy configuration

In particular, media streaming endpoints must **never allow arbitrary filesystem paths supplied by the client**.

The server should resolve media access through database IDs rather than accepting paths such as:

```text
/api/video?path=/etc/passwd
```

---

## Project Philosophy

LumaVault is not intended to compete with commercial streaming platforms.

It is a personal, self-hosted media platform designed to provide a clean streaming experience for media stored on your own hardware.

```text
Your Hardware
      ↓
Your Storage
      ↓
Your Media
      ↓
Your Network
      ↓
Your LumaVault
```

No cloud required.

---

## License

This project is intended for personal and educational use.

Media files are not included with the project. Users are responsible for ensuring they have the appropriate rights or permissions for any media they store or stream using LumaVault.
