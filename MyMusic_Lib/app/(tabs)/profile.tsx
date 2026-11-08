import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

import AsyncStorage from "@react-native-async-storage/async-storage";
// Agar browser popup tertutup otomatis setelah login
WebBrowser.maybeCompleteAuthSession();

// ... import tetap sama
export default function ProfileScreen() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // Fungsi untuk cek apakah di HP sudah ada data user yang tersimpan
  const [authLoading, setAuthLoading] = useState(false);
  const checkLocalUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("@user_data");
      if (savedUser) {
        setUserInfo(JSON.parse(savedUser)); // Jika ada, langsung login-kan otomatis
      }
    } catch (e) {
      console.error("Gagal mengambil data lokal", e);
    }
  };

  // Jalankan pengecekan tepat saat layar ini dimuat pertama kali
  useEffect(() => {
    checkLocalUser();
  }, []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    // Android Client ID tetap (untuk nanti kalau sudah build native)
    androidClientId:
      "254119493575-o24kpkm6qd7pgl50k7ui0d9nq2s2mpq9.apps.googleusercontent.com",

    // Web Client ID (untuk testing di Expo Go)
    webClientId:
      "254119493575-ip4plsu1kvr1q88l4aa7hns8veqaf091.apps.googleusercontent.com",

    /**
     * JANGAN pakai path: "MyMusic_Lib" secara manual jika itu menyebabkan error.
     * Cukup panggil fungsinya kosong.
     * Setelah kamu 'npx expo login', fungsi ini akan otomatis menghasilkan:
     * https://auth.expo.io/@username-kamu/MyMusic_Lib
     */
    redirectUri: AuthSession.makeRedirectUri(),
    scopes: ["openid", "profile", "email"]
  });

  useEffect(() => {
    if (response?.type === "success") {
      // Ambil authentication dari response
      const { authentication } = response;
      setAuthLoading(false);

      // LOG ini sangat penting: Cek apakah token muncul di console terminal/metro
      console.log("Token didapat:", authentication?.accessToken);

      if (authentication?.accessToken) {
        handleLoginBackend(authentication.accessToken);
      }
    } else if (response?.type === "error") {
      console.error("Login Error:", response.error);
      Alert.alert("Login Gagal", "Terjadi kesalahan saat otentikasi Google.");
      setAuthLoading(false);
    }
  }, [response]);

  // ... sisanya handleLoginBackend dan return UI tetap sama

  const handleLoginBackend = async (token: any) => {
    try {
      const res = await fetch("http://192.168.1.5:8000/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token })
      });
      const data = await res.json();
      if (data.status === "success") {
        setUserInfo(data.user);
        // Tambahkan baris ini untuk simpan permanen di memori HP
        await AsyncStorage.setItem("@user_data", JSON.stringify(data.user));
        Alert.alert("Sukses", `Halo, ${data.user.name}!`);
      }
    } catch (error) {
      Alert.alert("Error", "Gagal verifikasi ke server.");
    }
  };

  const confirmLogout = async () => {
    await AsyncStorage.removeItem("@user_data");
    setUserInfo(null);
    setShowLogoutModal(false); // Tutup modal setelah berhasil logout
  };

  return (
    <View style={styles.container}>
      <Ionicons
        name={userInfo ? "person-circle" : "person-circle-outline"}
        size={100}
        color="#1DB954"
      />

      <Text style={styles.title}>
        {userInfo ? `Halo, ${userInfo.name}` : "Sudah punya akun?"}
      </Text>

      <Text style={styles.subtitle}>
        {userInfo
          ? `Email: ${userInfo.email}`
          : "Login untuk menyimpan playlist favoritmu secara permanen."}
      </Text>

      {userInfo ? (
        // Jika SUDAH login, tampilkan tombol Logout
        <TouchableOpacity
          style={[
            styles.loginBtn,
            { backgroundColor: "#FF4444", marginTop: 20 }
          ]}
          onPress={() => setShowLogoutModal(true)} // Pemicu modal muncul
        >
          <Text style={styles.loginText}>Logout dari Akun</Text>
        </TouchableOpacity>
      ) : (
        // Jika BELUM login, tampilkan tombol Login Google
        <TouchableOpacity
          style={styles.loginBtn}
          disabled={!request}
          onPress={async () => {
            // 📱 MOBILE → pakai dummy login
            if (Platform.OS !== "web") {
              try {
                setAuthLoading(true);

                const res = await fetch("http://192.168.1.5:8000/dummy-login", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  }
                });
                const data = await res.json();

                if (data.status === "success") {
                  setUserInfo(data.user);
                  await AsyncStorage.setItem(
                    "@user_data",
                    JSON.stringify(data.user)
                  );
                  Alert.alert("Sukses", `Halo, ${data.user.name}!`);
                }
              } catch (error) {
                Alert.alert("Error", "Dummy login gagal.");
              } finally {
                setAuthLoading(false);
              }
            } else {
              // WEB → tetap Google login
              setAuthLoading(true);
              await promptAsync();
            }
          }}
        >
          <Text style={styles.loginText}>Masuk dengan Google</Text>
        </TouchableOpacity>
      )}

      {authLoading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#121212",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999
          }}
        >
          <Ionicons name="logo-google" size={50} color="#1DB954" />
          <Text style={{ color: "#fff", marginTop: 20 }}>
            Membuka Google Login...
          </Text>
        </View>
      )}

      {/* Custom Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name="alert-circle"
              size={50}
              color="#FF4444"
              style={{ marginBottom: 15 }}
            />

            <Text style={styles.modalTitle}>Yakin ingin keluar?</Text>
            <Text style={styles.modalSubtitle}>
              Kamu perlu login ulang untuk mengakses playlist favoritmu nanti.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.btnTextCancel}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.btnConfirm]}
                onPress={confirmLogout}
              >
                <Text style={styles.btnTextConfirm}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
// ... styles tetap sama

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
    padding: 40
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 20 },
  subtitle: {
    color: "#888",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30
  },
  loginBtn: {
    backgroundColor: "#1DB954",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30
  },
  loginText: { color: "#fff", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)", // Lebih gelap dikit biar fokus ke modal
    justifyContent: "center",
    alignItems: "center",
    padding: 20 // Memberi jarak aman
  },
  modalContent: {
    width: "90%", // Default untuk mobile (hampir memenuhi layar)
    maxWidth: 400, // KUNCI RESPONSIVE: Di web/layar lebar, modal tidak akan lebih dari 400px
    backgroundColor: "#1E1E1E",
    borderRadius: 25, // Sedikit lebih bulat biar modern
    padding: 30,
    alignItems: "center",
    elevation: 20, // Shadow lebih tegas
    shadowColor: "#000", // Shadow untuk iOS/Web
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#BBB",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between"
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5
  },
  btnCancel: {
    backgroundColor: "#333"
  },
  btnConfirm: {
    backgroundColor: "#FF4444"
  },
  btnTextCancel: {
    color: "#FFF",
    fontWeight: "600"
  },
  btnTextConfirm: {
    color: "#FFF",
    fontWeight: "bold"
  }
});
