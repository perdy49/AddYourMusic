import React, { useState, useEffect, useCallback } from "react"; // Tambah useCallback
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  RefreshControl, // Tambah ini
  GestureResponderEvent
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ListScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const deleteHistory = async (index: number) => {
    try {
      const item = history[index];

      const savedUser = await AsyncStorage.getItem("@user_data");
      if (!savedUser) return;

      const user = JSON.parse(savedUser);

      // 🔥 HIT BACKEND
      await fetch("http://192.168.1.5:8000/delete-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: user.email,
          title: item.title,
          url: item.url,
          mode: item.mode
        })
      });

      // 🔥 UPDATE UI
      const updated = [...history];
      updated.splice(index, 1);
      setHistory(updated);
    } catch (e) {
      console.log("Error delete:", e);
    }
    };
    const handleConfirmDelete = () => {
  if (selectedIndex !== null) {
    deleteHistory(selectedIndex);
    setSelectedIndex(null);
    setShowDeleteModal(false);
  }
  };
  

  const fetchHistory = async () => {
    const savedUser = await AsyncStorage.getItem("@user_data");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      try {
        const res = await fetch(
          `http://192.168.1.5:8000/get-history/${user.email}`
        );
        const result = await res.json();
        if (result.status === "success") {
          setHistory(result.data);
        }
      } catch (e) {
        console.log("Error fetch history:", e);
      }
    }
  };

  // Fungsi untuk handle tarik ke bawah (refresh)
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory().then(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const deleteAllHistory = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("@user_data");
      if (!savedUser) return;

      const user = JSON.parse(savedUser);

      await fetch("http://192.168.1.5:8000/delete-all-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: user.email
        })
      });

      setHistory([]);
    } catch (e) {
      console.log("Error delete all:", e);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1e1e1e", "#121212"]}
        style={styles.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1DB954"
          />
        }
      >
        <Text style={styles.title}>Rekomendasi Untukmu</Text>
        <Text style={styles.subtitle}>Berdasarkan pencarian AI kamu</Text>

        {history.length > 0 ? (
          <>
            <View style={styles.grid}>
              {history.map((item, index) => (
                <View key={index} style={styles.historyCardNew}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => Linking.openURL(item.url)}
                  >
                    <View style={styles.cardContent}>
                      {item.mode === "youtube" ? (
                        <Ionicons
                          name="logo-youtube"
                          size={30}
                          color="#FF0000"
                        />
                      ) : (
                        <FontAwesome name="spotify" size={30} color="#1DB954" />
                      )}

                      <Text style={styles.historyTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedIndex(index);
                      setShowDeleteModal(true);
                    }}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            {/* 🔥 REKOMENDASI */}
            {history.length >= 1 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Rekomendasi Lainnya</Text>

                  <TouchableOpacity onPress={() => setShowDeleteAllModal(true)}>
                    <Text style={styles.deleteAllText}>Hapus</Text>
                  </TouchableOpacity>
                </View>

                {[...history]
                  .sort(() => 0.5 - Math.random())
                  .slice(0, 3)
                  .map((item, index) => (
                    <TouchableOpacity
                      key={"random-" + index}
                      style={styles.recommendCardBetter}
                      onPress={() => Linking.openURL(item.url)}
                    >
                      <View style={styles.recommendLeft}>
                        {item.mode === "youtube" ? (
                          <Ionicons
                            name="logo-youtube"
                            size={20}
                            color="#FF0000"
                          />
                        ) : (
                          <FontAwesome
                            name="spotify"
                            size={20}
                            color="#1DB954"
                          />
                        )}
                      </View>

                      <Text
                        style={styles.recommendTextBetter}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>

                      <Ionicons name="chevron-forward" size={16} color="#666" />
                    </TouchableOpacity>
                  ))}
              </>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={80} color="#333" />
            <Text style={styles.emptyText}>Belum ada riwayat pencarian.</Text>
            <Text style={styles.emptySubText}>
              Cari lagu di tab Home dulu yuk!
            </Text>
          </View>
        )}
      </ScrollView>
      {showDeleteModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Yakin ingin dihapus?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.btnText}>Tidak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnDelete}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.btnText}>Ya</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showDeleteAllModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons
              name="trash-outline"
              size={40}
              color="#FF4444"
              style={{ marginBottom: 10 }}
            />

            <Text style={styles.modalTitle}>Hapus semua riwayat?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setShowDeleteAllModal(false)}
              >
                <Text style={styles.btnText}>Tidak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnDelete}
                onPress={() => {
                  deleteAllHistory();
                  setShowDeleteAllModal(false);
                }}
              >
                <Text style={styles.btnText}>Ya</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    padding: 20,
    paddingTop: 60,
    width: "100%",
    maxWidth: 800,
    alignSelf: "center"
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 5 },
  subtitle: { fontSize: 14, color: "#888", marginBottom: 25 },

  // STYLING CARD YANG KAMU BUTUHKAN:
  historyCard: {
    flexDirection: "row",
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 15,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    // Efek shadow untuk Web
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  iconContainer: {
    width: 45,
    height: 45,
    backgroundColor: "#282828",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15
  },
  textContainer: {
    flex: 1
  },
  historyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3
  },
  historySubtitle: {
    color: "#666",
    fontSize: 12
  },

  // Empty State
  emptyState: {
    marginTop: 100,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20
  },
  emptySubText: {
    color: "#666",
    marginTop: 10
  },
  historyCardNew: {
    width: "48%",
    aspectRatio: 1, // 🔥 INI KUNCI KOTAK
    backgroundColor: "#1e1e1e",
    borderRadius: 20,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center",
    alignItems: "center"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },

  sectionTitle: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "bold"
},

  recommendCard: {
    backgroundColor: "#282828",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8
  },

  recommendText: {
    color: "#ccc",
    fontSize: 13
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#333",
    borderRadius: 20,
    padding: 5
  },
  cardContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  recommendCardNew: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: "#282828",
    borderRadius: 20,
    padding: 10,
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center"
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center"
  },

  modalBox: {
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 20,
    width: "80%",
    maxWidth: 300, // 🔥 INI KUNCI RESPONSIVE
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333"
  },

  modalTitle: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
    fontWeight: "600"
  },

  modalButtons: {
    flexDirection: "row",
    gap: 10
  },

  btnCancel: {
    backgroundColor: "#333",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10
  },

  btnDelete: {
    backgroundColor: "#FF4444",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold"
  },

  recommendCardBetter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a"
  },

  recommendLeft: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#282828",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },

  recommendTextBetter: {
    flex: 1,
    color: "#fff",
    fontSize: 14
  },

  sectionHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 30,
  marginBottom: 20,
  paddingHorizontal: 2
},

  deleteAllText: {
    color: "#FF4444",
    fontSize: 13,
    fontWeight: "bold"
  }
});
