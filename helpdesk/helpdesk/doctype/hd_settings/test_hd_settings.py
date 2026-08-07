# -*- coding: utf-8 -*-
# Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and Contributors
# See license.txt
from __future__ import unicode_literals

import unittest

import frappe


class TestHDSettings(unittest.TestCase):
    def test_chatbot_api_url_field_exists_with_default(self):
        meta = frappe.get_meta("HD Settings")
        field = meta.get_field("chatbot_api_url")
        self.assertIsNotNone(field, "chatbot_api_url field missing from HD Settings")
        self.assertEqual(field.fieldtype, "Data")
        value = frappe.db.get_single_value("HD Settings", "chatbot_api_url")
        self.assertEqual(value, "http://localhost:8000")
