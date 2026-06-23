from fastapi import APIRouter, File, UploadFile, HTTPException
import cv2
import numpy as np
import base64

router = APIRouter()

BRIGHTNESS_LOW = 80
BRIGHTNESS_HIGH = 180
BLUR_LOW = 100
CONTRAST_LOW = 35
NOISE_HIGH = 15
SHADOW_HIGH = 25


def _score(value: float, low: float, high: float) -> int:
    return int(min(100, max(0, (value - low) / (high - low) * 100)))


def calculate_blur(image: np.ndarray) -> tuple[float, int]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    score = _score(variance, 50, 800)
    return variance, score


def calculate_brightness(image: np.ndarray) -> tuple[float, int, str]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    mean = float(np.mean(gray))
    score = _score(mean, 40, 200)
    if mean < BRIGHTNESS_LOW:
        level = "low"
    elif mean > BRIGHTNESS_HIGH:
        level = "high"
    else:
        level = "normal"
    return mean, score, level


def calculate_contrast(image: np.ndarray) -> tuple[float, int, str]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    std = float(gray.std())
    score = _score(std, 20, 80)
    level = "poor" if std < CONTRAST_LOW else "good"
    return std, score, level


def calculate_noise(image: np.ndarray) -> tuple[float, int, str]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32)
    denoised = cv2.GaussianBlur(gray, (5, 5), 0)
    noise = float(np.std(gray - denoised))
    score = int(min(100, max(0, 100 - noise * 4)))
    if noise > NOISE_HIGH:
        level = "high"
    elif noise > 8:
        level = "moderate"
    else:
        level = "low"
    return noise, score, level


def calculate_shadow_coverage(image: np.ndarray) -> tuple[float, int, str]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    dark_mask = gray < 60
    coverage = float(np.sum(dark_mask) / dark_mask.size * 100)
    score = int(min(100, max(0, 100 - coverage * 1.5)))
    return coverage, score, f"{coverage:.0f}%"


def blur_level(score: int) -> str:
    if score < 45:
        return "high"
    if score < 70:
        return "medium"
    return "low"


def analyze_image(image: np.ndarray) -> dict:
    _, blur_score = calculate_blur(image)
    _, brightness_score, brightness_level = calculate_brightness(image)
    _, contrast_score, contrast_level = calculate_contrast(image)
    _, noise_score, noise_level = calculate_noise(image)
    shadow_pct, shadow_score, shadow_level = calculate_shadow_coverage(image)

    overall = int(
        (blur_score + brightness_score + contrast_score + noise_score + shadow_score) / 5
    )

    return {
        "blur_score": blur_score,
        "blur_level": blur_level(blur_score),
        "brightness_score": brightness_score,
        "brightness_level": brightness_level,
        "contrast_score": contrast_score,
        "contrast_level": contrast_level,
        "noise_score": noise_score,
        "noise_level": noise_level,
        "shadow_score": shadow_score,
        "shadow_coverage": shadow_level,
        "overall_score": overall,
    }


def apply_gamma(image: np.ndarray, gamma: float = 1.4) -> np.ndarray:
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype("uint8")
    return cv2.LUT(image, table)


def apply_clahe(image: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def apply_sharpening(image: np.ndarray) -> np.ndarray:
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    return cv2.filter2D(image, -1, kernel)


def apply_denoising(image: np.ndarray) -> np.ndarray:
    return cv2.fastNlMeansDenoisingColored(image, None, 6, 6, 7, 21)


def apply_histogram_equalization(image: np.ndarray) -> np.ndarray:
    yuv = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
    yuv[:, :, 0] = cv2.equalizeHist(yuv[:, :, 0])
    return cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)


def apply_contrast_stretch(image: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l_min, l_max = l.min(), l.max()
    if l_max > l_min:
        l = ((l - l_min) / (l_max - l_min) * 255).astype(np.uint8)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)


def adaptive_enhance(image: np.ndarray, metrics: dict) -> tuple[np.ndarray, list[str], list[dict]]:
    enhanced = image.copy()
    applied = []
    strategies = []

    if metrics["brightness_level"] == "low":
        enhanced = apply_gamma(enhanced)
        enhanced = apply_clahe(enhanced)
        applied.extend(["Gamma Correction", "CLAHE"])
        strategies.append({"condition": "Brightness", "level": metrics["brightness_level"], "enhancement": "Gamma Correction + CLAHE"})

    if metrics["blur_score"] < 65:
        enhanced = apply_sharpening(enhanced)
        applied.append("Sharpening")
        strategies.append({"condition": "Blur", "level": metrics["blur_level"], "enhancement": "Sharpening Filter"})

    if metrics["noise_level"] in ("moderate", "high"):
        enhanced = apply_denoising(enhanced)
        applied.append("Fast Non-Local Means")
        strategies.append({"condition": "Noise", "level": metrics["noise_level"], "enhancement": "Fast Non-Local Means"})

    shadow_pct = float(metrics["shadow_coverage"].rstrip("%"))
    if shadow_pct > SHADOW_HIGH:
        enhanced = apply_histogram_equalization(enhanced)
        applied.append("Histogram Equalization")
        strategies.append({"condition": "Shadow Coverage", "level": metrics["shadow_coverage"], "enhancement": "Histogram Equalization"})

    if metrics["contrast_level"] == "poor":
        enhanced = apply_contrast_stretch(enhanced)
        applied.append("Contrast Stretching")
        strategies.append({"condition": "Contrast", "level": metrics["contrast_level"], "enhancement": "Contrast Stretching"})

    if not applied:
        enhanced = apply_clahe(enhanced)
        applied.append("CLAHE")
        strategies.append({"condition": "General", "level": "normal", "enhancement": "CLAHE"})

    return enhanced, list(dict.fromkeys(applied)), strategies


def encode_image(image: np.ndarray) -> str:
    _, buffer = cv2.imencode(".jpg", image)
    return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"


@router.post("/analyze")
async def analyze_quality(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image")

        before = analyze_image(img)
        enhanced_img, applied, strategies = adaptive_enhance(img, before)
        after = analyze_image(enhanced_img)

        conditions = [
            {
                "label": "Brightness",
                "level": before["brightness_level"],
                "score": before["brightness_score"],
                "enhancement": next(
                    (s["enhancement"] for s in strategies if s["condition"] == "Brightness"),
                    "No enhancement needed",
                ),
            },
            {
                "label": "Blur",
                "level": before["blur_level"],
                "score": before["blur_score"],
                "enhancement": next(
                    (s["enhancement"] for s in strategies if s["condition"] == "Blur"),
                    "No enhancement needed",
                ),
            },
            {
                "label": "Contrast",
                "level": before["contrast_level"],
                "score": before["contrast_score"],
                "enhancement": next(
                    (s["enhancement"] for s in strategies if s["condition"] == "Contrast"),
                    "No enhancement needed",
                ),
            },
            {
                "label": "Noise",
                "level": before["noise_level"],
                "score": before["noise_score"],
                "enhancement": next(
                    (s["enhancement"] for s in strategies if s["condition"] == "Noise"),
                    "No enhancement needed",
                ),
            },
            {
                "label": "Shadow Coverage",
                "level": before["shadow_coverage"],
                "score": before["shadow_score"],
                "enhancement": next(
                    (s["enhancement"] for s in strategies if s["condition"] == "Shadow Coverage"),
                    "No enhancement needed",
                ),
            },
        ]

        return {
            "quality_score_before": int(before["overall_score"]),
            "quality_score_after": int(after["overall_score"]),
            "improvement": int(after["overall_score"]) - int(before["overall_score"]),
            "brightness": before["brightness_level"],
            "blur": before["blur_level"],
            "contrast": before["contrast_level"],
            "noise": before["noise_level"],
            "shadow_coverage": before["shadow_coverage"],
            "quality_metrics": {"before": before, "after": after},
            "conditions": conditions,
            "enhancements_applied": applied,
            "enhanced_image": encode_image(enhanced_img),
            "original_image": encode_image(img),
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
