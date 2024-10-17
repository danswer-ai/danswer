from mistune import Markdown
from mistune import Renderer


def format_slack_message(message: str) -> str:
    renderer = Markdown(renderer=SlackRenderer())
    return renderer.render(message)


class SlackRenderer(Renderer):
    SPECIALS = {"&": "&amp;", "<": "&lt;", ">": "&gt;"}

    def escape_special(self, text):
        for special, replacement in self.SPECIALS.items():
            text = text.replace(special, replacement)
        return text

    def header(self, text, level, raw=None):
        return f"*{text}*\n"

    def emphasis(self, text):
        return f"_{text}_"

    def double_emphasis(self, text):
        return f"*{text}*"

    def strikethrough(self, text):
        return f"~{text}~"

    def list(self, body, ordered=True):
        lines = body.split("\n")
        count = 0
        for i, line in enumerate(lines):
            if line.startswith("li: "):
                count += 1
                prefix = f"{count}. " if ordered else "• "
                lines[i] = f"{prefix}{line[4:]}"
        return "\n".join(lines)

    def list_item(self, text):
        return f"li: {text}\n"

    def link(self, link, title, content):
        escaped_link = self.escape_special(link)
        if content:
            return f"<{escaped_link}|{content}>"
        if title:
            return f"<{escaped_link}|{title}>"
        return f"<{escaped_link}>"

    def image(self, src, title, text):
        escaped_src = self.escape_special(src)
        display_text = title or text
        return f"<{escaped_src}|{display_text}>" if display_text else f"<{escaped_src}>"

    def codespan(self, text):
        return f"`{text}`"

    def block_code(self, text, lang):
        return f"```\n{text}\n```\n"

    def paragraph(self, text):
        return f"{text}\n"

    def autolink(self, link, is_email):
        return link if is_email else self.link(link, None, None)
