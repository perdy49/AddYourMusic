import React, { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome } from "@expo/vector-icons";

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("spotify");
  // Menjadi baris ini (menambahkan tipe 'any' agar TypeScript tidak protes):
  const [videos, setVideos] = useState<any[]>([]);

  const saveToHistory = async (videoTitle: string, videoUrl: string) => {
    try {
      const savedUser = await AsyncStorage.getItem("@user_data");
      console.log("User di storage:", savedUser); // CEK INI

      if (!savedUser) {
        console.log("Simpan batal: User belum login");
        return;
      }

      const user = JSON.parse(savedUser);

      const response = await fetch("http://192.168.1.5:8000/save-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          title: videoTitle,
          url: videoUrl,
          mode: mode // Pastikan variabel 'mode' ini terbaca (spotify/youtube)
        })
      });

      const result = await response.json();
      console.log("Respon dari server simpan:", result); // CEK INI
    } catch (e) {
      console.log("Error Fetch Save:", e);
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  const handlePredict = async () => {
    if (!query) {
      Alert.alert("Input Kosong", "Ketik dulu judul lagunya ya!");
      return;
    }

    setLoading(true);
    setVideos([]); // Reset daftar video sebelum mencari yang baru

    try {
      const response = await fetch("http://192.168.1.5:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: query,
          mode: mode
        })
      });

      const result = await response.json();

      if (result.status === "success") {
        // SIMPAN HASIL VIDEO KE STATE
        if (result.data.videos) {
          setVideos(result.data.videos);
        }

        console.log("Data diterima:", result.data.videos);
      }
    } catch (error) {
      Alert.alert("Koneksi Gagal", "Cek server Python di laptop!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1e1e1e", "#121212"]}
        style={styles.background}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.welcomeText}>Halo, Pencari Musik!</Text>
          <Text style={styles.title}>Pilih mode & cari lagumu</Text>
        </Animated.View>

        {/* --- POTONGAN BARU: PANDUAN PAKAI --- */}
        <View style={styles.guideContainer}>
          <Text style={styles.sectionTitle}>Panduan Cepat:</Text>
          <View style={styles.guideCard}>
            <View style={styles.guideStep}>
              <Ionicons name="radio-button-on" size={16} color="#1DB954" />
              <Text style={styles.guideText}>
                Pilih Spotify atau YouTube di bawah
              </Text>
            </View>
            <View style={styles.guideStep}>
              <Ionicons name="search-outline" size={16} color="#1DB954" />
              <Text style={styles.guideText}>
                Ketik judul lagu & klik Proses AI
              </Text>
            </View>
            <View style={styles.guideStep}>
              <Ionicons name="list-outline" size={16} color="#1DB954" />
              <Text style={styles.guideText}>
                Lagu favorit bisa dilihat di tab Musik
              </Text>
            </View>
          </View>
        </View>
        {/* --- END POTONGAN BARU --- */}

        {/* Mode Selector */}
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === "spotify" && styles.activeModeSpotify
            ]}
            onPress={() => setMode("spotify")}
          >
            <FontAwesome
              name="spotify"
              size={20}
              color={mode === "spotify" ? "#fff" : "#888"}
            />
            <Text
              style={[styles.modeText, mode === "spotify" && styles.activeText]}
            >
              Spotify
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === "youtube" && styles.activeModeYoutube
            ]}
            onPress={() => setMode("youtube")}
          >
            <Ionicons
              name="logo-youtube"
              size={20}
              color={mode === "youtube" ? "#fff" : "#888"}
            />
            <Text
              style={[styles.modeText, mode === "youtube" && styles.activeText]}
            >
              YouTube
            </Text>
          </TouchableOpacity>
        </View>

        {/* Input Pencarian */}
        <View style={styles.searchContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="search"
              size={20}
              color="#888"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.input}
              placeholder={
                mode === "spotify" ? "Cari di Spotify..." : "Cari di YouTube..."
              }
              placeholderTextColor="#666"
              value={query}
              onChangeText={setQuery}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.predictButton, { opacity: loading ? 0.6 : 1 }]}
            onPress={handlePredict}
            disabled={loading}
          >
            <LinearGradient
              colors={
                mode === "spotify"
                  ? ["#1DB954", "#191414"]
                  : ["#FF0000", "#282828"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.predictText}>Proses AI</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* --- TEMPAT DAFTAR VIDEO (HASIL) DALAM CARD MINIMALIS --- */}
        {videos.length > 0 && (
          <View style={styles.resultsWrapper}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>
                Hasil Pencarian {mode.toUpperCase()}
              </Text>
              <Text style={styles.resultCount}>{videos.length} ditemukan</Text>
            </View>

            {/* Wadah Utama (Card) */}
            <View style={styles.scrollableCard}>
              <ScrollView
                style={{ flex: 1 }}
                nestedScrollEnabled={true} // Penting agar scroll lancar di Android
                showsVerticalScrollIndicator={true}
              >
                {videos.map((item, index) => (
                  <View key={index} style={styles.miniVideoCard}>
                    <View style={styles.miniThumbnail}>
                      <Ionicons
                        name="play-circle"
                        size={24}
                        color={mode === "youtube" ? "#FF0000" : "#1DB954"}
                      />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          Linking.openURL(item.url);
                          saveToHistory(item.title, item.url);
                        }}
                        style={styles.miniWatchButton}
                      >
                        <Text
                          style={[
                            styles.watchText,
                            {
                              color: mode === "youtube" ? "#FF0000" : "#1DB954"
                            }
                          ]}
                        >
                          {mode === "youtube" ? "YouTube" : "Spotify"}
                        </Text>
                        <Ionicons
                          name="open-outline"
                          size={10}
                          color={mode === "youtube" ? "#FF0000" : "#1DB954"}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Linking.openURL(item.url);
                          saveToHistory(item.title, item.url); // Ini pemicunya
                        }}
                        style={styles.miniWatchButton}
                      ></TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Status Koneksi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Koneksi</Text>
          <View style={styles.card}>
            <View style={[styles.dot, { backgroundColor: "#1DB954" }]} />
            <Text style={styles.cardTitle}>Server: 192.168.100.9 (Aktif)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%"
  },
  scrollContent: {
    padding: 25,
    paddingTop: 60,
    width: "100%",
    maxWidth: 800,
    alignSelf: "center"
  },
  header: { marginBottom: 30 },
  welcomeText: {
    fontSize: 14,
    color: "#1DB954",
    fontWeight: "600",
    marginBottom: 5
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  modeContainer: { flexDirection: "row", gap: 10, marginBottom: 25 },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#282828",
    borderWidth: 1,
    borderColor: "#333"
  },
  activeModeSpotify: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  activeModeYoutube: { backgroundColor: "#FF0000", borderColor: "#FF0000" },
  modeText: { color: "#888", fontWeight: "600" },
  activeText: { color: "#fff" },
  searchContainer: { marginBottom: 30 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#282828",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 15,
    maxWidth: 800,
    height: 60,
    borderWidth: 1,
    borderColor: "#444"
  },
  searchIcon: { marginRight: 10 },
  input: { flex: 1, color: "#fff", fontSize: 16 },
  predictButton: { borderRadius: 15, overflow: "hidden" },
  gradientBtn: {
    flexDirection: "row",
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  predictText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  section: { marginBottom: 30, marginTop: 10 },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12
  },
  card: {
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  cardTitle: { color: "#fff", fontSize: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // HASIL VIDEO STYLES
  resultsWrapper: { marginBottom: 30 },
  videoCard: {
    flexDirection: "row",
    backgroundColor: "#1e1e1e",
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333"
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 50,
    backgroundColor: "#000",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  videoInfo: { flex: 1, marginLeft: 15 },
  videoTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 5
  },
  watchButton: {
    backgroundColor: "#282828",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#444"
  },
  watchText: { fontSize: 11, fontWeight: "bold" },

  guideContainer: {
    marginBottom: 20
  },
  guideCard: {
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#333",
    // Tambahkan shadow dikit biar kelihatan premium di web
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5
  },
  guideStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  guideText: {
    color: "#aaa",
    fontSize: 13
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  resultsListContainer: {
    paddingBottom: 10
  },
  scrollableCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 20,
    height: 300, // Kamu bisa atur tinggi card-nya di sini agar minimalis
    padding: 10,
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden" // Memastikan isi tidak keluar dari border radius
  },
  miniVideoCard: {
    flexDirection: "row",
    backgroundColor: "#282828",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    alignItems: "center"
  },
  miniThumbnail: {
    width: 40,
    height: 40,
    backgroundColor: "#000",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  miniWatchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2
  },
  resultCount: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600"
  }
});
