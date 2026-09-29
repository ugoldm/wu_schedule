import json
import unittest
from datetime import date, time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "docs" / "agenda" / "data" / "schedule.json"


class AgendaSnapshotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(DATA_PATH.read_text(encoding="utf-8"))

    def test_snapshot_metadata_is_preserved(self):
        self.assertEqual(self.data["semester"], "Winter semester 2026/27")
        self.assertEqual(self.data["timezone"], "Europe/Vienna")
        self.assertEqual(self.data["generated"], "2026-09-25T08:50:19")
        self.assertEqual(len(self.data["events"]), 185)
        self.assertEqual(len(self.data["courses"]), 17)

    def test_course_group_ids_are_unique(self):
        course_ids = [course["course_id"] for course in self.data["courses"]]
        self.assertEqual(len(course_ids), len(set(course_ids)))

    def test_events_reference_known_course_groups(self):
        known = {
            (course["course"], course.get("group"), course["course_id"])
            for course in self.data["courses"]
        }
        for event in self.data["events"]:
            with self.subTest(event=event["id"]):
                self.assertIn(
                    (event["course"], event.get("group"), event["course_id"]),
                    known,
                )

    def test_event_dates_and_times_are_valid(self):
        start = date.fromisoformat(self.data["date_min"])
        end = date.fromisoformat(self.data["date_max"])
        for event in self.data["events"]:
            with self.subTest(event=event["id"]):
                event_date = date.fromisoformat(event["date"])
                self.assertLessEqual(start, event_date)
                self.assertLessEqual(event_date, end)
                self.assertLess(
                    time.fromisoformat(event["start_time"]),
                    time.fromisoformat(event["end_time"]),
                )

    def test_personal_profiles_reference_known_ids(self):
        known_ids = {course["course_id"] for course in self.data["courses"]}
        iurii = {"1312", "1327", "1195", "1314", "2432"}
        anna = {"1192", "1327", "1196", "2430", "2463"}
        self.assertLessEqual(iurii, known_ids)
        self.assertLessEqual(anna, known_ids)


if __name__ == "__main__":
    unittest.main()
