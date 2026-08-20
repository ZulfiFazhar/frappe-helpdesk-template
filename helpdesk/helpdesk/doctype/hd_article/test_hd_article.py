# Copyright (c) 2021, Frappe Technologies and Contributors
# See license.txt
import frappe
from frappe.tests import IntegrationTestCase


class TestHDArticleFeedback(IntegrationTestCase):
    def setUp(self):
        self.article = frappe.get_doc(
            {
                "doctype": "HD Article",
                "title": "Test Article",
                "status": "Published",
                "content": "<p>Test content</p>",
            }
        ).insert()

    def tearDown(self):
        frappe.db.delete("HD Article Feedback", {"article": self.article.name})
        frappe.delete_doc("HD Article", self.article.name, force=True)

    def get_counts(self):
        likes = frappe.db.count(
            "HD Article Feedback",
            filters={"article": self.article.name, "feedback": 1},
        )
        dislikes = frappe.db.count(
            "HD Article Feedback",
            filters={"article": self.article.name, "feedback": 2},
        )
        return likes, dislikes

    def test_like_increases_like_count(self):
        self.article.set_feedback(1)
        likes, dislikes = self.get_counts()
        self.assertEqual(likes, 1)
        self.assertEqual(dislikes, 0)

    def test_dislike_increases_dislike_count(self):
        self.article.set_feedback(2)
        likes, dislikes = self.get_counts()
        self.assertEqual(likes, 0)
        self.assertEqual(dislikes, 1)

    def test_like_then_dislike_updates_correctly(self):
        self.article.set_feedback(1)
        likes, dislikes = self.get_counts()
        self.assertEqual(likes, 1)
        self.assertEqual(dislikes, 0)

        # on switching to dislike, like count should reduce and dislike should increase hence set feedback to 2
        self.article.set_feedback(2)
        likes, dislikes = self.get_counts()
        self.assertEqual(likes, 0)
        self.assertEqual(dislikes, 1)

    def test_dislike_then_like_updates_correctly(self):
        self.article.set_feedback(2)
        likes, dislikes = self.get_counts()
        self.assertEqual(likes, 0)
        self.assertEqual(dislikes, 1)

        # switch to like, dislike should reduce and like should increase
        self.article.set_feedback(1)
        likes, dislikes = self.get_counts()
        self.assertEqual(likes, 1)
        self.assertEqual(dislikes, 0)

    def test_same_feedback_does_not_change_count(self):
        self.article.set_feedback(1)
        likes_before, _ = self.get_counts()

        self.article.set_feedback(1)
        likes_after, _ = self.get_counts()

        self.assertEqual(likes_before, likes_after)

    def test_feedback_creates_single_record(self):
        # multiple calls should not create multiple records
        self.article.set_feedback(1)
        self.article.set_feedback(2)
        self.article.set_feedback(1)

        total = frappe.db.count(
            "HD Article Feedback",
            filters={
                "article": self.article.name,
                "user": frappe.session.user,
            },
        )
        self.assertEqual(total, 1)


class TestHDArticleRagFields(IntegrationTestCase):
    def setUp(self):
        self.article = frappe.get_doc(
            {
                "doctype": "HD Article",
                "title": "RAG Test Article",
                "status": "Draft",
                "content": "<p>Test content from RAG upload</p>",
                "rag_doc_id": "test-doc-abc",
                "minio_object_key": "uuid-test-file.pdf",
            }
        ).insert()

    def tearDown(self):
        frappe.delete_doc("HD Article", self.article.name, force=True)

    def test_rag_doc_id_persists(self):
        doc = frappe.get_doc("HD Article", self.article.name)
        self.assertEqual(doc.rag_doc_id, "test-doc-abc")

    def test_minio_object_key_persists(self):
        doc = frappe.get_doc("HD Article", self.article.name)
        self.assertEqual(doc.minio_object_key, "uuid-test-file.pdf")

    def test_find_article_by_rag_doc_id(self):
        result = frappe.db.get_value(
            "HD Article",
            {"rag_doc_id": "test-doc-abc"},
            ["name", "title", "status"],
        )
        self.assertIsNotNone(result)
        name, title, status = result
        self.assertEqual(title, "RAG Test Article")
        self.assertEqual(status, "Draft")
