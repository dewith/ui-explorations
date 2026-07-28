import SwiftUI

struct ContentView: View {
    @State private var searchText = ""
    @State private var isListening = false

    var body: some View {
        ZStack(alignment: .top) {
            LinearGradient(
                colors: [
                    Color(red: 0.05, green: 0.12, blue: 0.3),
                    Color(red: 0.25, green: 0.07, blue: 0.05)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack {
                SiriSearchBar(text: $searchText, isListening: $isListening)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                Spacer()
                Button(isListening ? "Stop Listening" : "Activate") {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        isListening.toggle()
                    }
                }
                .foregroundStyle(.white.opacity(0.7))
                .padding(.bottom, 50)
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct SiriSearchBar: View {
    @Binding var text: String
    @Binding var isListening: Bool

    private let cornerRadius: CGFloat = 22

    var body: some View {
        HStack(spacing: 10) {
            TextField("Search or Ask", text: $text)
                .foregroundStyle(.white.opacity(0.55))
                .tint(.white)

            Image(systemName: isListening ? "waveform" : "mic.fill")
                .foregroundStyle(.white.opacity(isListening ? 1 : 0.65))
                .font(.system(size: 16))
                .animation(.easeInOut(duration: 0.2), value: isListening)
                .onTapGesture {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        isListening.toggle()
                    }
                }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .background(glassBackground)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay(animatedBorder)
    }

    // Frosted dark glass: material blur + dark tint + top-to-transparent gradient
    private var glassBackground: some View {
        ZStack {
            Rectangle().fill(.regularMaterial)
            Color.black.opacity(0.45)
            LinearGradient(
                stops: [
                    .init(color: .black.opacity(0.85), location: 0),
                    .init(color: .black.opacity(0.2), location: 0.6),
                    .init(color: .clear, location: 1)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        }
    }

    // Static thin border at rest, spinning color gradient when listening
    @ViewBuilder
    private var animatedBorder: some View {
        if isListening {
            TimelineView(.animation) { context in
                let t = context.date.timeIntervalSinceReferenceDate
                let angle = (t * 90).truncatingRemainder(dividingBy: 360)
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(
                        AngularGradient(
                            colors: [.blue, .indigo, .purple, .pink, .blue],
                            center: .center,
                            angle: .degrees(angle)
                        ),
                        lineWidth: 1.5
                    )
            }
            .transition(.opacity.animation(.easeIn(duration: 0.3)))
        } else {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .strokeBorder(.white.opacity(0.12), lineWidth: 0.5)
                .transition(.opacity.animation(.easeOut(duration: 0.3)))
        }
    }
}
