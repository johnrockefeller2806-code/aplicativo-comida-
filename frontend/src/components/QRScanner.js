import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, CheckCircle, AlertCircle } from "lucide-react";

const QRScanner = ({ onScan, onClose, isProcessing }) => {
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
        
        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (!isProcessing) {
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // Ignore scan errors (no QR found)
          }
        );
        setHasPermission(true);
      } catch (err) {
        console.error("Camera error:", err);
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
        setHasPermission(false);
      }
    };

    startScanner();

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [onScan, isProcessing]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="text-lg font-bold">Escanear QR Code</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
          data-testid="close-qr-scanner"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="text-center text-white">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <p className="mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : isProcessing ? (
          <div className="text-center text-white">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <p>Validando QR Code...</p>
          </div>
        ) : (
          <>
            <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black">
              <div id="qr-reader" ref={scannerRef} className="w-full h-full" />
              
              {/* Scan Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-2 border-white/30 rounded-2xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#E5F943] rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#E5F943] rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#E5F943] rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#E5F943] rounded-br-lg" />
                </div>
              </div>
            </div>
            
            <p className="mt-6 text-white/70 text-center text-sm">
              Aponte a câmera para o QR Code do cliente
            </p>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 text-center text-white/50 text-xs">
        <Camera className="w-5 h-5 mx-auto mb-2" />
        O QR Code confirma a entrega e libera seu pagamento automaticamente
      </div>
    </div>
  );
};

export default QRScanner;
