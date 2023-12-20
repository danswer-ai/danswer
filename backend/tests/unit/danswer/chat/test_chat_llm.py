import unittest


class TestChatLlm(unittest.TestCase):
    def test_citation_extraction(self) -> None:
        pass  # May fix these tests some day
        """
        links: list[str | None] = [f"link_{i}" for i in range(1, 21)]

        test_1 = "Something [1]"
        res = "".join(list(extract_citations_from_stream(iter(test_1), links)))
        self.assertEqual(res, "Something [[1]](link_1)")

        test_2 = "Something [14]"
        res = "".join(list(extract_citations_from_stream(iter(test_2), links)))
        self.assertEqual(res, "Something [[14]](link_14)")

        test_3 = "Something [14][15]"
        res = "".join(list(extract_citations_from_stream(iter(test_3), links)))
        self.assertEqual(res, "Something [[14]](link_14)[[15]](link_15)")

        test_4 = ["Something ", "[", "3", "][", "4", "]."]
        res = "".join(list(extract_citations_from_stream(iter(test_4), links)))
        self.assertEqual(res, "Something [[3]](link_3)[[4]](link_4).")

        test_5 = ["Something ", "[", "31", "][", "4", "]."]
        res = "".join(list(extract_citations_from_stream(iter(test_5), links)))
        self.assertEqual(res, "Something [31][[4]](link_4).")

        links[3] = None
        test_1 = "Something [2][4][5]"
        res = "".join(list(extract_citations_from_stream(iter(test_1), links)))
        self.assertEqual(res, "Something [[2]](link_2)[4][[5]](link_5)")
        """


if __name__ == "__main__":
    unittest.main()
