import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from "react-native";
import * as Linking from "expo-linking";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcSurfaceView,
  VideoViewSetupMode,
} from "react-native-agora";

const { width } = Dimensions.get("window");
const BACKEND_BASE_URL = "https://sec-ysa.vercel.app";
const DEFAULT_AGORA_APP_ID = "6296767b095e4e7e8b62283832baebdf";

export default function App() {
  const [roomCode, setRoomCode] = useState<string>("");
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState<boolean>(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [statusText, setStatusText] = useState<string>("Siap bergabung ke kelas live");

  const agoraEngineRef = useRef<IRtcEngine | null>(null);

  // ─── Deep Linking Handler (secapp://live?room=ROOM_CODE) ────────────
  const handleDeepLink = useCallback((url: string | null) => {
    if (!url) return;
    try {
      const parsed = Linking.parse(url);
      if (parsed.queryParams && parsed.queryParams.room) {
        const code = String(parsed.queryParams.room).toUpperCase().trim();
        setRoomCode(code);
        setStatusText(`Tautan kelas terdeteksi: ${code}`);
      }
    } catch (e) {
      console.warn("[DeepLink Error]:", e);
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(handleDeepLink);
    const subscription = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });
    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  // ─── Initialize Agora RTC Engine ────────────────────────────────────
  const initAgora = async () => {
    if (agoraEngineRef.current) return;
    try {
      const engine = createAgoraRtcEngine();
      engine.initialize({
        appId: DEFAULT_AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });

      engine.registerEventHandler({
        onJoinChannelSuccess: (connection, elapsed) => {
          setIsJoined(true);
          setIsLoading(false);
          setStatusText(`Terhubung ke ruangan: ${connection.channelId}`);
        },
        onUserJoined: (connection, remoteUid) => {
          setRemoteUids((prev) => [...prev, remoteUid]);
        },
        onUserOffline: (connection, remoteUid) => {
          setRemoteUids((prev) => prev.filter((id) => id !== remoteUid));
        },
        onError: (errType, msg) => {
          console.error("[Agora Error]:", errType, msg);
          setStatusText(`Error Agora: ${msg}`);
          setIsLoading(false);
        },
      });

      engine.enableVideo();
      engine.startPreview();
      agoraEngineRef.current = engine;
    } catch (err: any) {
      console.error("[initAgora Exception]:", err);
      Alert.alert("Gagal Inisialisasi RTC", err?.message || "Error tidak diketahui");
    }
  };

  // ─── Join Channel with Token from SEC Backend ───────────────────────
  const joinClassroom = async () => {
    const cleanRoom = roomCode.trim().toUpperCase();
    if (!cleanRoom) {
      Alert.alert("Perhatian", "Silakan masukkan kode ruangan terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setStatusText("Mengambil token dari server SEC...");

    try {
      await initAgora();
      const engine = agoraEngineRef.current;
      if (!engine) throw new Error("RTC Engine belum siap");

      // 1. Fetch token from backend API
      const tokenUrl = `${BACKEND_BASE_URL}/api/live-class/${cleanRoom}/token`;
      const res = await fetch(tokenUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? "Silakan login ke SEC Web sebelum bergabung."
            : `Gagal otentikasi token (Status ${res.status})`
        );
      }

      const data = await res.json();
      const token = data.rtcToken || data.token;
      const numericUid = Number(data.uid) || 0;

      // 2. Set client role and join Agora SFU channel
      engine.setClientRoleType(ClientRoleType.ClientRoleBroadcaster);
      engine.joinChannel(token, cleanRoom, numericUid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert("Gagal Bergabung", err?.message || "Tidak dapat menghubungi server");
      setStatusText("Gagal bergabung ke ruangan");
    }
  };

  // ─── Leave Classroom ────────────────────────────────────────────────
  const leaveClassroom = () => {
    try {
      const engine = agoraEngineRef.current;
      if (engine) {
        engine.leaveChannel();
      }
    } finally {
      setIsJoined(false);
      setRemoteUids([]);
      setStatusText("Telah keluar dari kelas");
    }
  };

  // ─── Media Controls ─────────────────────────────────────────────────
  const toggleMute = () => {
    const engine = agoraEngineRef.current;
    if (engine) {
      const nextMuted = !isMuted;
      engine.muteLocalAudioStream(nextMuted);
      setIsMuted(nextMuted);
    }
  };

  const toggleVideo = () => {
    const engine = agoraEngineRef.current;
    if (engine) {
      const nextDisabled = !isVideoDisabled;
      engine.muteLocalVideoStream(nextDisabled);
      setIsVideoDisabled(nextDisabled);
    }
  };

  const switchCamera = () => {
    const engine = agoraEngineRef.current;
    if (engine) {
      engine.switchCamera();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLogo}>
          <Text style={styles.logoText}>SEC</Text>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>LIVE APP</Text>
          </View>
        </View>
        <Text style={styles.statusIndicator}>{statusText}</Text>
      </View>

      {/* Main Viewport */}
      {!isJoined ? (
        <View style={styles.lobbyCard}>
          <Text style={styles.lobbyTitle}>Portal Kelas Interaktif</Text>
          <Text style={styles.lobbySubtitle}>
            Aplikasi resmi SEC untuk mengikuti sesi bimbingan live dengan latensi rendah dan audio jernih.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>KODE RUANG KELAS</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: SEC-ABCD"
              placeholderTextColor="#64748b"
              value={roomCode}
              onChangeText={setRoomCode}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={[styles.joinButton, isLoading && styles.joinButtonDisabled]}
            onPress={joinClassroom}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.joinButtonText}>Masuk ke Ruang Kelas</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Tip: Tautan &quot;secapp://live?room=...&quot; dari browser otomatis mengisi kode ruangan ini.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.classroomContainer}>
          {/* Video Grid */}
          <ScrollView contentContainerStyle={styles.videoGrid}>
            {/* Local Video Stream */}
            <View style={styles.videoTile}>
              {!isVideoDisabled ? (
                <RtcSurfaceView
                  style={styles.surfaceView}
                  canvas={{ uid: 0, setupMode: VideoViewSetupMode.VideoViewSetupAdd }}
                />
              ) : (
                <View style={styles.placeholderView}>
                  <Text style={styles.placeholderText}>Kamera Mati</Text>
                </View>
              )}
              <View style={styles.tileLabel}>
                <Text style={styles.tileLabelText}>Anda (Lokal)</Text>
              </View>
            </View>

            {/* Remote Participants */}
            {remoteUids.map((uid) => (
              <View key={uid} style={styles.videoTile}>
                <RtcSurfaceView
                  style={styles.surfaceView}
                  canvas={{ uid, setupMode: VideoViewSetupMode.VideoViewSetupAdd }}
                />
                <View style={styles.tileLabel}>
                  <Text style={styles.tileLabelText}>Peserta #{uid}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Classroom Controls Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              onPress={toggleMute}
            >
              <Text style={styles.controlBtnText}>{isMuted ? "Unmute" : "Mute"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, isVideoDisabled && styles.controlBtnActive]}
              onPress={toggleVideo}
            >
              <Text style={styles.controlBtnText}>{isVideoDisabled ? "Cam On" : "Cam Off"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
              <Text style={styles.controlBtnText}>Putar Cam</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.leaveBtn} onPress={leaveClassroom}>
              <Text style={styles.leaveBtnText}>Keluar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#0f172a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 1,
  },
  liveBadge: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  statusIndicator: {
    color: "#94a3b8",
    fontSize: 11,
    maxWidth: "50%",
  },
  lobbyCard: {
    margin: 20,
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  lobbyTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  lobbySubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  joinButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  infoBox: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  infoText: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
  },
  classroomContainer: {
    flex: 1,
  },
  videoGrid: {
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  videoTile: {
    width: (width - 36) / 2,
    height: 220,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  surfaceView: {
    flex: 1,
  },
  placeholderView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  placeholderText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  tileLabel: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tileLabelText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "#0f172a",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  controlBtn: {
    backgroundColor: "#334155",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  controlBtnActive: {
    backgroundColor: "#e11d48",
  },
  controlBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  leaveBtn: {
    backgroundColor: "#dc2626",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  leaveBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
});
