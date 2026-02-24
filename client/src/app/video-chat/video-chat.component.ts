import {
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
  viewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { VideoChatService } from '../services/video-chat.service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-video-chat',
  imports: [MatIcon],
  template: `
    <div class="relative h-full w-full">
      <video
        class="w-32 absolute right-5 top-4 h-52 object-cover border-red-500 border-2 rounded-lg"
        #localVideo
        autoplay
        playsInline
      ></video>
      <video
        class="w-full h-full object-cover bg-slate-800"
        #remoteVideo
        autoplay
        playsInline
      ></video>

      <div
        class="absolute bottom-10 left-0 right-0 z-50 flex justify-center space-x-3 p-4"
      >
        @if (signalRService.incomingCall) {
          <button
            class="bg-green-500 flex items-center gap-2 hover:bg-gray-700 shadow-xl text-white font-bold py-2 px-4 rounded-full"
            (click)="acceptCall()"
          >
            <mat-icon>call</mat-icon> Accept
          </button>
          <button
            class="bg-red-500 flex items-center gap-2 hover:bg-gray-700 shadow-xl text-white font-bold py-2 px-4 rounded-full"
            (click)="declineCall()"
          >
            <mat-icon>call_end</mat-icon> Decline
          </button>
        }

        @if (!signalRService.incomingCall && !signalRService.isCallActive) {
          <button
            class="bg-green-500 flex items-center gap-2 hover:bg-gray-700 shadow-xl text-white font-bold py-2 px-4 rounded-full"
            (click)="startCall()"
          >
            <mat-icon>call</mat-icon> Start Call
          </button>
        }

        @if (!this.signalRService.incomingCall) {
          <button
            class="bg-red-500 flex items-center gap-2 hover:bg-red-900 shadow-xl text-white font-bold py-2 px-4 rounded-full"
            (click)="endCall()"
          >
            <mat-icon>call_end</mat-icon> End Call
          </button>
        }
      </div>
    </div>
  `,
  styles: ``,
})
export class VideoChatComponent implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private peerConnection!: RTCPeerConnection;
  signalRService = inject(VideoChatService);
  private dialogRef: MatDialogRef<VideoChatComponent> = inject(MatDialogRef);

  ngOnInit(): void {
    // Component açıldığında çalışır.
    // 1️⃣ WebRTC bağlantı nesnesini oluşturur
    // 2️⃣ Kullanıcının kamera & mikrofonunu açar
    // 3️⃣ SignalR üzerinden gelecek event’leri dinlemeye başlar
    this.setupPeerConnection();
    this.startLocalVideo();
    this.setupSignalListeners();
  }

  setupSignalListeners() {
    // Karşı taraf çağrıyı bitirdiğinde tetiklenir.
    // Burada mutlaka endCall() çağrılmalı ki:
    // - Kamera kapansın
    // - PeerConnection kapansın
    // - UI temizlensin
    this.signalRService.hubConnection.on('CallEnded', () => {
      // this.endCall();
    });

    // Aramayı başlatan tarafın gönderdiği Answer burada alınır.
    // Bu sadece arayan taraf için çalışır.
    this.signalRService.answerReceived.subscribe(async (data) => {
      if (data) {
        // Karşı tarafın bağlantı bilgilerini (SDP) set eder.
        // Bu işlemden sonra WebRTC bağlantısı tamamlanır.
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer),
        );
      }
    });

    // Karşı taraftan gelen ICE candidate’leri burada alırız.
    // ICE candidate’ler iki cihazın network üzerinden
    // birbirini bulmasını sağlar.
    this.signalRService.iceCandidateReceived.subscribe(async (data) => {
      if (data) {
        // Gelen network bilgisini bağlantıya ekler.
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(data.candidate),
        );
      }
    });
  }

  declineCall() {
    // Kullanıcı gelen çağrıyı reddettiğinde çalışır.

    // UI state resetlenir
    this.signalRService.incomingCall = false;
    this.signalRService.isCallActive = false;

    // Karşı tarafa çağrının reddedildiği bildirilir
    this.signalRService.sendEndCall(this.signalRService.remoteUserId);

    // Dialog kapatılır
    this.dialogRef.close();
  }

  async acceptCall() {
    // Kullanıcı gelen çağrıyı kabul ettiğinde çalışır.

    // Artık çağrı aktif
    this.signalRService.incomingCall = false;
    this.signalRService.isCallActive = true;

    // SignalR service içinde saklanan offer alınır
    let offer = await this.signalRService.offerReceived.getValue()?.offer;

    if (offer) {
      // Arayan tarafın gönderdiği SDP bilgisi
      // remote description olarak set edilir.
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer),
      );

      // Offer’a cevap olarak answer üretilir
      let answer = await this.peerConnection.createAnswer();

      // Bu answer kendi local description’ımız olur
      await this.peerConnection.setLocalDescription(answer);

      // Answer karşı tarafa SignalR ile gönderilir
      this.signalRService.sendAnswer(this.signalRService.remoteUserId, answer);
    }
  }

  async startCall() {
    // Aramayı başlatan taraf burayı çalıştırır.

    // Çağrı artık aktif
    this.signalRService.isCallActive = true;

    // WebRTC bağlantı teklifi (offer) oluşturulur
    let offer = await this.peerConnection.createOffer();

    // Bu offer kendi local description’ımız olur
    await this.peerConnection.setLocalDescription(offer);

    // Offer SignalR ile karşı tarafa gönderilir
    this.signalRService.sendOffer(this.signalRService.remoteUserId, offer);
  }

  setupPeerConnection() {
    // WebRTC bağlantı nesnesi oluşturulur.
    // ICE server’lar NAT arkasındaki cihazların
    // birbirini bulmasına yardımcı olur.
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
      ],
    });

    // Tarayıcı yeni bir network yolu (ICE candidate)
    // bulduğunda çalışır.
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Bulunan network bilgisi karşı tarafa gönderilir
        this.signalRService.sendIceCandidate(
          this.signalRService.remoteUserId,
          event.candidate,
        );
      }
    };

    // Karşı tarafın media stream’i geldiğinde çalışır.
    // Bu sayede karşı tarafın görüntüsü ekrana basılır.
    this.peerConnection.ontrack = (event) => {
      this.remoteVideo.nativeElement.srcObject = event.streams[0];
    };
  }

  async startLocalVideo() {
    // Kullanıcının kamera ve mikrofonuna erişim ister.
    // Tarayıcı burada izin popup’ı gösterir.
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    // Kendi görüntümüzü local video elementine bağlarız
    this.localVideo.nativeElement.srcObject = stream;

    // Kamera ve mikrofon track’lerini
    // peerConnection’a ekleriz.
    // Böylece karşı taraf bizi görebilir / duyabilir.
    stream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, stream);
    });
  }

  async endCall() {
    const remoteId = this.signalRService.remoteUserId;

    // 1️⃣ MediaStream durdur
    const stream = this.localVideo.nativeElement.srcObject as MediaStream;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    // 2️⃣ PeerConnection kapat
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    // 3️⃣ Video elementleri temizle
    this.localVideo.nativeElement.srcObject = null;
    this.remoteVideo.nativeElement.srcObject = null;

    // 4️⃣ State reset
    this.signalRService.isCallActive = false;
    this.signalRService.incomingCall = false;
    this.signalRService.remoteUserId = '';

    // 5️⃣ Karşı tarafa bildir
    if (remoteId) {
      this.signalRService.sendEndCall(remoteId);
    }

    // 6️⃣ Dialog kapat
    this.dialogRef.close();
  }
}
