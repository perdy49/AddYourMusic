from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import re
import urllib.request
import urllib.parse
import json
from google.oauth2 import id_token
from google.auth.transport import requests
import sqlite3
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MusicRequest(BaseModel):
    title: str
    mode: str

def clean_music_title(raw_title: str):
    clean = re.sub(r'\(.*?\)|\[.*?\]|official|video|audio|lyrics|hd|4k|music video', '', raw_title, flags=re.IGNORECASE)
    return " ".join(clean.split()).strip()

def search_youtube(query):
    try:
        encoded_query = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded_query}"
        # Tambahkan User-Agent agar tidak diblokir YouTube
        headers = {'User-Agent': 'Mozilla/5.0'}
        req = urllib.request.Request(url, headers=headers)
        response = urllib.request.urlopen(req)
        html = response.read().decode()
        
        # Regex untuk mengambil ID Video dan Judul Video secara bersamaan
        # Ini akan mencari pola "title":{"runs":[{"text":"JUDUL_LAGU"}],"accessibility" ... "videoId":"ID_VIDEO"}
        video_data = re.findall(r'"title":\{"runs":\[\{"text":"(.*?)"\}\],"accessibility".*?"videoId":"(\S{11})"', html)
        
        results = []
        # Batasi 10 hasil untuk YouTube
        for title, v_id in video_data[:10]:
            # Membersihkan unicode escape jika ada
            clean_title = title.encode().decode('unicode_escape') if '\\u' in title else title
            results.append({
                "id": v_id,
                "title": clean_title, # Sekarang judulnya asli dari YouTube (misal: Bruno Mars - Die With A Smile)
                "thumbnail": f"https://img.youtube.com/vi/{v_id}/0.jpg",
                "url": f"https://www.youtube.com/watch?v={v_id}"
            })
        return results
    except Exception as e:
        print(f"Error Youtube: {e}")
        return []

def search_spotify(query):
    encoded_query = urllib.parse.quote(query)
    # Karena kita belum pakai API resmi Spotify (masih deep link), 
    # kita buatkan list sugesti manual agar tidak monoton.
    variations = [
        f"Lagu terpopuler {query}",
        f"Album terbaru {query}",
        f"Mix radio {query}",
        f"Koleksi terbaik {query}",
        f"Live session {query}"
    ]
    
    results = []
    # Batasi 5 hasil untuk Spotify sesuai permintaanmu
    for i, text in enumerate(variations[:5]):
        results.append({
            "id": f"spot{i}",
            "title": text,
            "url": f"spotify:search:{urllib.parse.quote(text)}", 
            "thumbnail": "" 
        })
    return results

# HANYA GUNAKAN SATU FUNGSI PREDICT
@app.post("/predict")
async def predict(request: MusicRequest):
    prediction = clean_music_title(request.title)
    
    video_list = []
    
    if request.mode == "youtube":
        video_list = search_youtube(prediction)
    else:
        # Mode Spotify
        video_list = search_spotify(prediction)
    
    return {
        "status": "success",
        "data": {
            "prediction": prediction,
            "videos": video_list 
        }
    }
    
# Model data untuk login
class LoginRequest(BaseModel):
    token: str

# --- LOGIKA DATABASE SQLITE ---
# 1. Update Tabel Database
def init_db():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            name TEXT,
            picture TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Tabel Riwayat Pencarian
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT,
            title TEXT,
            url TEXT,
            mode TEXT,
            search_date DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# 2. Tambahkan class model baru
class SaveHistoryRequest(BaseModel):
    email: str
    title: str
    url: str
    mode: str

# 3. Endpoint untuk mengambil riwayat (buat ListScreen)
@app.get("/get-history/{email}")
async def get_history(email: str):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute('SELECT title, url, mode FROM history WHERE user_email = ? ORDER BY search_date DESC LIMIT 20', (email,))
    rows = cursor.fetchall()
    conn.close()
    
    history_list = [{"title": r[0], "url": r[1], "mode": r[2]} for r in rows]
    return {"status": "success", "data": history_list}

# 4. Update fungsi predict atau buat endpoint simpan (disarankan buat endpoint simpan)
@app.post("/save-history")
async def save_history(req: SaveHistoryRequest):
    # TAMBAHKAN PRINT INI UNTUK DEBUG
    print(f"--- DATABASE LOG ---")
    print(f"Menyimpan riwayat untuk: {req.email}")
    print(f"Judul: {req.title} | Mode: {req.mode}")
    
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('INSERT INTO history (user_email, title, url, mode) VALUES (?, ?, ?, ?)', 
                       (req.email, req.title, req.url, req.mode))
        conn.commit()
        conn.close()
        print("Berhasil disimpan ke SQLite!")
        return {"status": "success"}
    except Exception as e:
        print(f"Gagal simpan ke SQLite: {e}")
        return {"status": "error", "message": str(e)}
    
    # DELETE HISTORY
@app.post("/delete-history")
async def delete_history(req: SaveHistoryRequest):
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()

        cursor.execute(
            'DELETE FROM history WHERE user_email = ? AND title = ?',
            (req.email, req.title)
        )

        conn.commit()
        conn.close()

        print(f"Berhasil hapus: {req.title}")
        return {"status": "success"}

    except Exception as e:
        print(f"Gagal hapus: {e}")
        return {"status": "error", "message": str(e)}

# Panggil fungsi ini agar database otomatis dibuat saat server jalan
init_db()

# --- UPDATE FUNGSI GOOGLE LOGIN ---
@app.post("/google-login")
async def google_login(request_data: LoginRequest):
    try:
        # LOG: Cek apakah token masuk ke backend
        print(f"Menerima token: {request_data.token[:10]}...") 

        # 1. Verifikasi ke Google
        user_info_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={request_data.token}"
        
        req = urllib.request.Request(user_info_url)
        with urllib.request.urlopen(req) as response:
            user_data = json.loads(response.read().decode())

        # Validasi apakah data user benar-benar ada
        email = user_data.get("email")
        if not email:
            return {"status": "error", "message": "Token valid tapi email tidak ditemukan."}

        name = user_data.get("name", "User")
        picture = user_data.get("picture", "")

        # 2. Simpan ke SQLite
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR IGNORE INTO users (email, name, picture)
            VALUES (?, ?, ?)
        ''', (email, name, picture))
        conn.commit()
        conn.close()

        print(f"Login Berhasil: {email}") # LOG di server

        return {
            "status": "success",
            "user": {
                "name": name,
                "email": email,
                "picture": picture
            }
        }
    except Exception as e:
        print(f"Error pada Backend: {str(e)}") # Cek error di terminal VS Code kamu
        return {"status": "error", "message": "Gagal memproses token Google."}
    
@app.post("/dummy-login")
async def dummy_login():
    return {
        "status": "success",
        "user": {
            "name": "Mobile User",
            "email": "mobile@local.app",
            "picture": ""
        }
    }
    
class DeleteAllRequest(BaseModel):
    email: str

@app.post("/delete-all-history")
async def delete_all_history(req: DeleteAllRequest):
    try:
        conn = sqlite3.connect('users.db')
        cursor = conn.cursor()

        cursor.execute(
            'DELETE FROM history WHERE user_email = ?',
            (req.email,)
        )

        conn.commit()
        conn.close()

        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}