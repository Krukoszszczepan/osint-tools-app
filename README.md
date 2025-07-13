# OSINT Tools - Zaawansowana Baza Narzędzi

![Licencja](https://img.shields.io/badge/License-GPLv3-blue.svg)
![Narzędzia](https://img.shields.io/badge/Narzędzia-1600%2B-brightgreen.svg)
![Wersja](https://img.shields.io/badge/Wersja-2.0-orange.svg)

Dynamiczna aplikacja internetowa, która gromadzi, kategoryzuje i prezentuje setki narzędzi Open Source Intelligence (OSINT). Projekt ten ma na celu stworzenie przejrzystego, szybkiego i łatwego w użyciu interfejsu do eksploracji zasobów dostępnych dla analityków, badaczy i entuzjastów cyberbezpieczeństwa.

## 🚀 Wersja Live

**[Zobacz aplikację działającą na żywo](https://krukoszszczepan.github.io/osint-tools-app/)**

---

## 📸 Zrzut Ekranu

![Zrzut Ekranu Aplikacji](https://raw.githubusercontent.com/Krukoszszczepan/osint-tools-app/refs/heads/main/Zrzut%20ekranu%202025-07-13%20133952.png)

---

## ✨ Kluczowe Funkcje

* **Dynamiczne Ładowanie Danych:** Wszystkie narzędzia są wczytywane z zewnętrznego pliku `database.json`, dzięki czemu główna strona jest lekka i szybka.
* **Rozwijane Drzewo Kategorii:** Zamiast płaskiej listy, aplikacja wykorzystuje wielopoziomowe, rozwijane menu, które ułatwia nawigację po setkach kategorii.
* **Kodowanie Kolorami:** Każda główna kategoria ma przypisany unikalny kolor, co ułatwia wizualną identyfikację narzędzi.
* **Przełącznik Motywów:** Wbudowany przełącznik pozwala na wygodne przełączanie między motywem jasnym i ciemnym. Wybór jest zapisywany w pamięci przeglądarki.
* **Zaawansowana Wyszukiwarka:** Pasek wyszukiwania pozwala na błyskawiczne filtrowanie narzędzi po nazwie.

---

## 🛠️ Struktura Projektu

* `index.html`: Główny "szkielet" aplikacji.
* `style.css`: Arkusz stylów odpowiedzialny za wygląd, w tym za oba motywy kolorystyczne.
* `script.js`: Serce aplikacji. Odpowiada za wczytywanie danych, generowanie drzewa kategorii i kart narzędzi, filtrowanie oraz obsługę interakcji.
* `database.json`: Plik zawierający pełną listę wszystkich narzędzi i ich atrybutów (nazwa, URL, opis, kategoria).

---

## ⚙️ Instalacja i Uruchomienie Lokalne

Aby uruchomić projekt na własnym komputerze:

1.  Sklonuj repozytorium:
    ```bash
    git clone [https://github.com/Krukoszszczepan/osint-tools-app.git](https://github.com/Krukoszszczepan/osint-tools-app.git)
    ```
2.  Przejdź do folderu z projektem:
    ```bash
    cd osint-tools-app
    ```
3.  Uruchom prosty serwer WWW (wymagany Python):
    ```bash
    python -m http.server
    ```
4.  Otwórz przeglądarkę i wejdź na adres `http://localhost:8000`.

---

## 📜 Licencja

Ten projekt jest udostępniany na licencji **GNU General Public License v3.0**. Szczegóły znajdują się w pliku `LICENSE`.
