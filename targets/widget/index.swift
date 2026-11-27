// The System's widgets: today's main quests, streak and water, read from the App Group the app writes to.
import WidgetKit
import SwiftUI

let appGroup = "group.com.edwardapps.thesystem"

// What the app writes (src/lib/widget.js), as JSON under "summary".
struct Summary: Codable {
  var date: String?
  var level: Int?
  var streak: Int?
  var coins: Int?
  var done: Int?
  var total: Int?
  var next: [String]?
  var water: Int?
  var waterGoal: Int?
}

func loadSummary() -> Summary? {
  guard let defaults = UserDefaults(suiteName: appGroup),
        let json = defaults.string(forKey: "summary"),
        let data = json.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(Summary.self, from: data)
}

func todayKey(_ date: Date = Date()) -> String {
  let f = DateFormatter()
  f.calendar = Calendar(identifier: .gregorian)
  f.locale = Locale(identifier: "en_US_POSIX")
  f.timeZone = TimeZone.current
  f.dateFormat = "yyyy-MM-dd"
  return f.string(from: date)
}

struct QuestEntry: TimelineEntry {
  let date: Date
  let summary: Summary?
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> QuestEntry {
    QuestEntry(date: Date(), summary: Summary(date: todayKey(), level: 12, streak: 9, coins: 320, done: 1, total: 3, next: ["Read 20 pages", "Walk 30 minutes"], water: 3, waterGoal: 8))
  }

  func getSnapshot(in context: Context, completion: @escaping (QuestEntry) -> Void) {
    completion(QuestEntry(date: Date(), summary: loadSummary() ?? placeholder(in: context).summary))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<QuestEntry>) -> Void) {
    let now = Date()
    let summary = loadSummary()
    // Refresh at the next hour (and so also right after midnight, when a new day starts).
    let next = Calendar.current.nextDate(after: now, matching: DateComponents(minute: 0), matchingPolicy: .nextTime) ?? now.addingTimeInterval(3600)
    completion(Timeline(entries: [QuestEntry(date: now, summary: summary)], policy: .after(next)))
  }
}

let bg = Color(red: 0.004, green: 0.016, blue: 0.04)
let accent = Color(red: 0.62, green: 0.80, blue: 1.0)
let purple = Color(red: 0.66, green: 0.49, blue: 1.0)
let gold = Color(red: 0.94, green: 0.77, blue: 0.36)
let muted = Color(red: 0.58, green: 0.65, blue: 0.78)

struct Info {
  let today: Bool
  let done: Int
  let total: Int
  let next: [String]
  let level: Int
  let streak: Int
  let water: Int
  let waterGoal: Int

  init(_ s: Summary?, at date: Date) {
    today = s?.date == todayKey(date)
    done = today ? (s?.done ?? 0) : 0
    total = max(today ? (s?.total ?? 0) : 0, 0)
    next = today ? (s?.next ?? []) : []
    level = s?.level ?? 1
    streak = s?.streak ?? 0
    water = today ? (s?.water ?? 0) : 0
    waterGoal = s?.waterGoal ?? 8
  }

  var allClear: Bool { today && total > 0 && done >= total }
  var headline: String { !today ? "NEW DAY" : allClear ? "ALL CLEAR" : "MAIN QUESTS" }
  var nextLine: String { !today ? "Open the System to start your day." : allClear ? "Every main quest cleared." : (next.first ?? "Your quests are waiting.") }
}

struct TopRow: View {
  let info: Info
  var body: some View {
    HStack(spacing: 6) {
      Text("LV \(info.level)").font(.system(size: 12, weight: .bold, design: .rounded)).foregroundStyle(accent)
      Spacer(minLength: 4)
      Image(systemName: "flame.fill").font(.system(size: 11)).foregroundStyle(gold)
      Text("\(info.streak)").font(.system(size: 12, weight: .bold, design: .rounded)).foregroundStyle(gold)
    }
  }
}

struct QuestProgress: View {
  let info: Info
  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(info.headline).font(.system(size: 10, weight: .bold)).kerning(2).foregroundStyle(muted)
      Text(info.today ? "\(info.done)/\(info.total)" : "–").font(.system(size: 32, weight: .bold, design: .rounded)).foregroundStyle(.white)
      ProgressView(value: Double(info.done), total: Double(max(info.total, 1))).tint(purple)
    }
  }
}

struct SmallView: View {
  let info: Info
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      TopRow(info: info)
      QuestProgress(info: info)
      Text(info.nextLine).font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.85)).lineLimit(2)
      Spacer(minLength: 0)
    }
  }
}

struct MediumView: View {
  let info: Info
  var body: some View {
    HStack(alignment: .top, spacing: 14) {
      VStack(alignment: .leading, spacing: 6) {
        TopRow(info: info)
        QuestProgress(info: info)
        Spacer(minLength: 0)
        Link(destination: URL(string: "thesystem://do/water")!) {
          HStack(spacing: 4) {
            Image(systemName: "drop.fill").font(.system(size: 11))
            Text("+1  \(info.water)/\(info.waterGoal)").font(.system(size: 12, weight: .semibold, design: .rounded))
          }
          .foregroundStyle(accent)
        }
      }
      .frame(width: 118)
      VStack(alignment: .leading, spacing: 7) {
        if info.next.isEmpty {
          Text(info.nextLine).font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.85))
        } else {
          ForEach(Array(info.next.prefix(3).enumerated()), id: \.offset) { _, title in
            HStack(alignment: .top, spacing: 6) {
              Image(systemName: "circle").font(.system(size: 10, weight: .bold)).foregroundStyle(accent).padding(.top, 2)
              Text(title).font(.system(size: 13, weight: .medium)).foregroundStyle(.white).lineLimit(2)
            }
          }
        }
        Spacer(minLength: 0)
      }
    }
  }
}

struct CircularView: View {
  let info: Info
  var body: some View {
    Gauge(value: Double(info.done), in: 0...Double(max(info.total, 1))) {
      Text("Q")
    } currentValueLabel: {
      Text(info.today ? "\(info.done)/\(info.total)" : "–")
    }
    .gaugeStyle(.accessoryCircularCapacity)
  }
}

struct RectangularView: View {
  let info: Info
  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      Text("THE SYSTEM · \(info.headline)").font(.system(size: 11, weight: .bold))
      Text(info.today ? "\(info.done)/\(info.total) quests · streak \(info.streak)" : "New day").font(.system(size: 13, weight: .semibold))
      Text(info.nextLine).font(.system(size: 12)).lineLimit(1)
    }
  }
}

struct QuestWidgetView: View {
  @Environment(\.widgetFamily) var family
  let entry: QuestEntry
  var body: some View {
    let info = Info(entry.summary, at: entry.date)
    Group {
      switch family {
      case .accessoryCircular: CircularView(info: info)
      case .accessoryRectangular: RectangularView(info: info)
      case .systemMedium: MediumView(info: info)
      default: SmallView(info: info)
      }
    }
    .widgetURL(URL(string: "thesystem://do/quests"))
    .containerBackground(for: .widget) { bg }
  }
}

struct QuestWidget: Widget {
  let kind = "QuestWidget"
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      QuestWidgetView(entry: entry)
    }
    .configurationDisplayName("Today's quests")
    .description("Your main quests, streak and water.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
  }
}

@main
struct TheSystemWidgets: WidgetBundle {
  var body: some Widget {
    QuestWidget()
  }
}
