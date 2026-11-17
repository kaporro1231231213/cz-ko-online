# Czółko z ekipą — wersja online (serwer + WebRTC)

## Co zawiera
- Serwer Node.js + Socket.IO: pokoje, do 8 osób, kolejka, punkty, nowe hasła, przechodzenie tury i obsługa rozłączeń.
- Kamerki i mikrofony przez WebRTC (mesh), sygnalizacja przez Socket.IO.
- Każdy widzi hasła pozostałych graczy; jego własne hasło jest zamazane/ukryte.
- „Zgadłem!” daje punkt i przekazuje kolejkę; „Pasuję” pomija hasło bez punktu i przekazuje kolejkę.
- Animowane wejścia kart, podświetlenie aktywnego gracza i plansza przejścia między turami.
- Prywatny notatnik każdego gracza zapisujący się lokalnie w przeglądarce (nie jest wysyłany do serwera).

## Uruchomienie lokalnie
Wymagany Node.js 18+.
```bash
npm install
npm start
```
Otwórz http://localhost:3000. Do testów kilku osób na jednym komputerze użyj kilku kart. Kamerka/mikrofon: localhost lub HTTPS.

## Publikacja w internecie
Najprościej: Render (Web Service) lub Railway:
1. Wgraj cały folder projektu do repozytorium GitHub.
2. Utwórz nową usługę Web Service z repozytorium.
3. Build command: `npm install`
4. Start command: `npm start`
5. Ustaw Node 18 lub nowszy. Hosting musi udostępnić HTTPS (wymagane przez przeglądarki do kamery/mikrofonu).
6. Otwórz publiczny adres HTTPS i zaproś ekipę. Każdy wchodzi na ten sam adres, jedna osoba tworzy pokój, reszta wpisuje kod.

## Ważne — media i skala
WebRTC przesyła media bezpośrednio między przeglądarkami. Wersja mesh działa najlepiej w małych pokojach (zalecane 2–5 osób; limit aplikacji 8). W zależności od NAT/firewalla sieci może być potrzebny TURN. Dla niezawodnego wdrożenia publicznego dodaj TURN (np. coturn lub zarządzowany TURN) i docelowo SFU (LiveKit/mediasoup) — obecna konfiguracja STUN nie gwarantuje połączenia w każdej sieci.
Serwer gry przechowuje hasła w pamięci procesu; restart serwera kończy pokoje. To MVP, nie produkcyjny system z bazą danych/logowaniem.

## Sterowanie
- Zgadłem! — +1 punkt i kolejka przechodzi do następnej osoby.
- Pasuję — bez punktu, pomija hasło i kolejka przechodzi dalej.
- Notatnik — prywatny dla gracza, automatyczny zapis w localStorage na tym urządzeniu/przeglądarce.
