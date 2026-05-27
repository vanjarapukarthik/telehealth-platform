# Telehealth Live Broadcast Platform — Simple Explanation (Sir ki Explain Cheyataniki)

## Project enti? (What is this project?)

**One sentence:**  
Doctor live ga camera tho consultation broadcast chestadu; patients browser lo chusi, chat tho questions adagochu — anni real-time.

**In English:**  
A web app where a **doctor** can go **live** with camera and mic, and **patients** can **watch** that live stream and **chat** in real time. Like a small, focused “YouTube Live + chat” for telehealth.

---

## Main idea (Core concept)

| Who        | What they do |
|-----------|----------------|
| **Doctor** | Login → Create/start a “room” → Camera + mic auto start → Can share screen, start RTMP (e.g. YouTube), record, kick viewers, see chat. |
| **Patient** | Login → See list of “live now” rooms or enter room ID → Watch doctor’s video + send chat messages. |

Doctor = **broadcaster (host)**.  
Patients = **viewers only** (no video publish).

---

## Tech stack (Simple terms)

| Part       | Technology   | Simple meaning |
|-----------|--------------|----------------|
| **Frontend** | React (Vite) + Tailwind | Website UI — login, dashboard, live room, chat. |
| **Backend**  | Node.js + Express | Server — login, tokens, sessions, APIs. |
| **Live video** | LiveKit (WebRTC) | Real-time video/audio between doctor and viewers. |
| **Chat**      | Socket.io | Real-time text messages in the room. |
| **Database**  | MongoDB | Users, sessions, recordings, messages save avutayi. |
| **Auth**      | JWT | Login token — who is doctor, who is patient. |

---

## Main features (Sir ki point-wise)

1. **Login (Doctor / Patient)**  
   Separate logins; role-based (doctor vs patient).

2. **Doctor dashboard**  
   Doctor can start a live room (name + title), see “live now” and recent sessions.

3. **Live room**  
   - **Doctor side:** Own video, screen share, RTMP (e.g. YouTube), recording, viewer list, kick, chat.  
   - **Patient side:** Doctor’s video, chat only.

4. **RTMP broadcast**  
   Doctor can send the same live stream to YouTube (or other RTMP URL) while streaming in the app.

5. **Recording**  
   Session can be recorded (MP4); metadata stored in DB.

6. **Moderation**  
   Doctor can kick a viewer from the room.

7. **Live chat**  
   Real-time chat between doctor and all viewers in that room.

---

## Flow (Step-by-step — explain cheyataniki)

**Doctor:**
1. Login (doctor account).
2. Dashboard lo “Go live” — room ID and title enter chesi start.
3. Browser will ask camera/mic permission → allow.
4. Live room open avutundi — doctor video, controls (screen share, RTMP, record, kick), chat.
5. Patients same room ID tho join avutaru and watch + chat.

**Patient:**
1. Login (patient account).
2. “Watch Live” page — either “Live now” list lo room select or room ID type chesi “Watch”.
3. Doctor video play avutundi, chat box lo type chesi messages pampachu.

---

## Project structure (Brief)

- **Backend (Node + Express):**  
  Auth, token (LiveKit), sessions, stream (RTMP, record), chat, moderation — plus MongoDB models (User, Session, Recording, Message).

- **Frontend (React + Vite):**  
  Home, Login, Doctor Dashboard, Viewer page, Live Room (video + chat). Tailwind for UI.

- **LiveKit:**  
  Actual video/audio streaming (WebRTC). We only get token from our backend; LiveKit handles connection and streams.

---

## Sir ki cheppochu (One-minute script)

> “Sir, this is a **Telehealth Live Broadcast Platform**.  
> Doctor logs in and starts a **live room** with camera and mic. Patients log in and **watch** that live stream and can **chat** in real time.  
> We use **React** for the website, **Node.js** for the server, **MongoDB** for data, **LiveKit** for live video, and **Socket.io** for chat.  
> Doctor can also **share screen**, send the stream to **YouTube (RTMP)**, **record** the session, and **kick** viewers. So it’s a complete live consultation system with moderation and recording.”

---

## Demo cheyataniki (How to show)

1. **Backend:**  
   `cd backend` → `.env` set (MongoDB, LiveKit, JWT) → `node scripts/seed.js` → `npm run dev`.

2. **Frontend:**  
   `cd frontend` → `npm run dev` → browser lo open (e.g. localhost:5173).

3. **Doctor:**  
   Login with `doctor@telehealth.com` / `doctor123` → Dashboard → “Go live” → allow camera → show video, screen share, chat.

4. **Patient:**  
   Another browser/incognito → Login with `patient@telehealth.com` / `patient123` → “Watch Live” → same room select → show video and chat.

Idi simple ga sir ki project explain cheyadaniki and demo ivvadaniki use cheyochu.
