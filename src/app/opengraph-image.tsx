import { ImageResponse } from 'next/og';

// Image metadata
export const alt = 'Zahlenlotto - Number Drawing & Card Generation';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';
export const runtime = 'edge';

// Image generation
export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 64,
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontFamily: 'system-ui',
                    padding: '80px',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '40px',
                    }}
                >
                    <div
                        style={{
                            fontSize: 96,
                            fontWeight: 'bold',
                            background: 'linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)',
                            backgroundClip: 'text',
                            color: 'transparent',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        🎱 Zahlenlotto
                    </div>
                </div>
                <div
                    style={{
                        fontSize: 36,
                        color: '#cbd5e1',
                        textAlign: 'center',
                        maxWidth: '900px',
                        lineHeight: 1.4,
                    }}
                >
                    Number Drawing & Card Generation for Lottery Games
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
