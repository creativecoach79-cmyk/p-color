import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  disclaimer: string;
  summary: string;
  tone_direction: "warm" | "cool" | "neutral";
  season_type: string;
  sub_type: string;
  confidence: number;
  analysis: {
    skin_tone: string;
    brightness: string;
    saturation: string;
    contrast: string;
    overall_impression: string;
  };
  recommended_colors: {
    name: string;
    hex: string;
    reason: string;
  }[];
  avoid_colors: {
    name: string;
    hex: string;
    reason: string;
  }[];
  makeup_recommendations: {
    lip: string[];
    blush: string[];
    eyeshadow: string[];
  };
  hair_recommendations: string[];
  fashion_recommendations: string[];
  style_tip: string;
  photo_quality_note: string;
}

export async function analyzePersonalColor(imageBase64: string): Promise<AnalysisResult> {
  const API_KEY = process.env.GEMINI_API_KEY || "";
  if (!API_KEY) {
    throw new Error("API 키가 설정되지 않았습니다. 관리자에게 문의하세요.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // Extract mime type and base64 data
  const mimeTypeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
  const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

  const prompt = `
당신은 고도로 훈련된 전문 퍼스널컬러 컨설턴트이자 데이터 분석 전문가입니다.
동일한 사진에 대해 일관되고 신뢰할 수 있는 분석 결과를 제공하는 것이 가장 중요합니다.

[분석 원칙]
1. 주관적인 느낌보다는 이미지의 픽셀 데이터(피부, 입술, 눈동자 색상의 명도/채도/색상값)를 기반으로 객관적인 판단을 내리십시오.
2. 조명이나 화장의 영향을 최소화하고 사용자의 본연의 톤을 추출하도록 노력하십시오.
3. 동일한 시각 정보에 대해 항상 같은 결론에 도달할 수 있도록 논리적인 의사결정 트리를 따르십시오.

[분석 항목]
1. 피부 톤: 밝기(L*), 노란기(b*), 붉은기(a*)의 균형을 수치적으로 분석하여 맑음/차분함을 구분하십시오.
2. 전체 인상: 명도 대비(이목구비와 피부의 밝기 차), 채도 대비를 분석하여 '부드러움'과 '선명함'을 구분하십시오.
3. 웜/쿨 판단: 피부와 입술의 베이스 컬러가 노란색계열인지 푸른색계열인지 판단하십시오.
4. 4계절 타입: 봄 웜톤, 여름 쿨톤, 가을 웜톤, 겨울 쿨톤 중 하나를 선택하십시오.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        topP: 0.1,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            disclaimer: { type: Type.STRING },
            summary: { type: Type.STRING },
            tone_direction: { type: Type.STRING, enum: ["warm", "cool", "neutral"] },
            season_type: { type: Type.STRING },
            sub_type: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            analysis: {
              type: Type.OBJECT,
              properties: {
                skin_tone: { type: Type.STRING },
                brightness: { type: Type.STRING },
                saturation: { type: Type.STRING },
                contrast: { type: Type.STRING },
                overall_impression: { type: Type.STRING },
              },
              required: ["skin_tone", "brightness", "saturation", "contrast", "overall_impression"]
            },
            recommended_colors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hex: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["name", "hex", "reason"]
              }
            },
            avoid_colors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hex: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["name", "hex", "reason"]
              }
            },
            makeup_recommendations: {
              type: Type.OBJECT,
              properties: {
                lip: { type: Type.ARRAY, items: { type: Type.STRING } },
                blush: { type: Type.ARRAY, items: { type: Type.STRING } },
                eyeshadow: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["lip", "blush", "eyeshadow"]
            },
            hair_recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            fashion_recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            style_tip: { type: Type.STRING },
            photo_quality_note: { type: Type.STRING },
          },
          required: [
            "disclaimer", "summary", "tone_direction", "season_type", "sub_type", 
            "confidence", "analysis", "recommended_colors", "avoid_colors", 
            "makeup_recommendations", "hair_recommendations", "fashion_recommendations", 
            "style_tip", "photo_quality_note"
          ]
        }
      }
    });

    const text = response.text;
    
    if (!text) {
      throw new Error("분석 결과를 생성하지 못했습니다. 다른 사진으로 시도해 주세요.");
    }
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error. Raw text:", text);
      throw new Error("결과 데이터를 처리하는 중 오류가 발생했습니다.");
    }
  } catch (error: any) {
    console.error("Gemini API Error Details:", error);
    
    // Better error messages for the user
    if (error.message?.includes("SAFETY")) {
      throw new Error("이미지가 정책에 의해 거부되었습니다. 얼굴이 잘 보이는 다른 사진으로 시도해 주세요.");
    }
    if (error.message?.includes("quota") || error.status === 429) {
      throw new Error("일일 사용량이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (error.status === 403 || error.status === 401) {
      throw new Error("API 키 인증에 실패했습니다. 설정을 확인해 주세요.");
    }
    
    throw new Error(error.message || "분석 중 알 수 없는 오류가 발생했습니다.");
  }
}
