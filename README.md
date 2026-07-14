# CTEX Converter

[Open CTEX Converter](https://copy-tt.github.io/CTEX-Converter/)

CTEX Converter is a browser-based viewer and converter for PNG, JPEG, and supported Godot CTEX texture files. It runs entirely in the browser, so there is nothing to install and selected files are processed locally on your device.

## What it does

- Open PNG and JPEG images (`.jpg`, `.jpeg`, `.jpe`, `.jfif`)
- Open supported Godot CTEX texture files
- Preview images on a transparent checkerboard background
- Export the current image as PNG, JPG, or a newly generated CTEX file
- Rotate left or right, flip horizontally, and flip vertically before exporting
- Choose a JPG background color when converting transparent images, including RGB and HEX custom colors
- Zoom the preview manually or let it automatically fit the available space
- Switch between Light Mode and Dark Mode
- Use the interface in English, Korean, Simplified Chinese, Traditional Chinese, Japanese, or Russian

## How to use it

1. Choose **Open PNG**, **Open JPG**, or **Open CTEX**. You can also drop a supported file into the preview area.
2. Inspect the preview and file information.
3. Optionally rotate or flip the image, set a JPG background color, or choose a preview zoom mode. You can use a preset background color or enter a custom RGB or HEX value. Zoom changes only the on-screen view and does not affect export resolution. JPG does not support transparency, so transparent pixels are composited onto the selected background color when you export JPG.
4. Choose **Export PNG**, **Export JPG**, or **Export CTEX**.

Opening another file replaces the current image and clears its rotation and flip state. Export settings such as the JPG background color and Auto-fit Preview option remain available for the next file. The default appearance is Light Mode; the selected theme is remembered by your browser.

## Privacy and compatibility

- Files are processed locally in your browser; this project does not upload them to a server.
- A modern Chromium-based browser is recommended for the best save-file experience.
- CTEX output should be tested in the target Godot project before production use, especially when engine import settings differ.

## Support

If you would like to support the creator, you can do so through [Ko-fi](https://ko-fi.com/copy_tt).

---

# CTEX Converter

[CTEX Converter 열기](https://copy-tt.github.io/CTEX-Converter/)

CTEX Converter는 PNG, JPEG 및 지원되는 Godot CTEX 텍스처 파일을 브라우저에서 열고 변환할 수 있는 도구입니다. 별도 설치가 필요 없으며, 선택한 파일은 사용자의 기기에서 브라우저로만 처리됩니다.

## 제공 기능

- PNG와 JPEG 이미지 열기 (`.jpg`, `.jpeg`, `.jpe`, `.jfif`)
- 지원되는 Godot CTEX 텍스처 파일 열기
- 투명 배경을 확인할 수 있는 체커보드 Preview
- 현재 이미지를 PNG, JPG 또는 새 CTEX 파일로 내보내기
- 내보내기 전 좌·우 회전, 좌우 반전, 상하 반전
- 투명 이미지를 JPG로 변환할 때 JPG 배경색 선택 및 RGB·HEX 사용자 지정
- Preview 전용 수동 확대·축소 또는 자동 맞춤
- Light Mode와 Dark Mode 전환
- English, 한국어, 简体中文, 繁體中文, 日本語, Русский 인터페이스

## 사용 방법

1. **Open PNG**, **Open JPG**, **Open CTEX** 중 하나를 선택합니다. 지원되는 파일을 Preview 영역으로 끌어다 놓아도 됩니다.
2. Preview와 파일 정보를 확인합니다.
3. 필요하면 회전, 반전, JPG 배경색 또는 Preview 확대 방식을 설정합니다. JPG 배경색은 프리셋을 고르거나 RGB·HEX 값으로 직접 지정할 수 있습니다. Preview는 확대·축소할 수 있지만, 이는 화면 표시만 바꾸며 내보내기 해상도에는 영향을 주지 않습니다. JPG는 투명도를 지원하지 않으므로, JPG로 내보낼 때 투명 픽셀은 선택한 배경색 위에 합성됩니다.
4. **Export PNG**, **Export JPG**, **Export CTEX** 중 하나를 선택합니다.

다른 파일을 열면 현재 이미지가 교체되고 회전·반전 상태는 초기화됩니다. JPG 배경색과 Auto-fit Preview 같은 내보내기 설정은 다음 파일에서도 유지됩니다. 기본 테마는 Light Mode이며, 선택한 테마는 브라우저에 기억됩니다.

## 개인정보 및 호환성

- 파일은 브라우저 안에서만 처리되며, 이 프로젝트는 파일을 서버에 업로드하지 않습니다.
- 파일 저장 기능을 가장 원활하게 사용하려면 최신 Chromium 기반 브라우저를 권장합니다.
- 특히 엔진의 가져오기 설정이 다른 경우에는, 실제 사용 전 대상 Godot 프로젝트에서 CTEX 출력 파일을 확인하는 것이 좋습니다.

## 지원

프로젝트를 지원하고 싶으시다면 [Ko-fi](https://ko-fi.com/copy_tt)를 이용하실 수 있습니다.
