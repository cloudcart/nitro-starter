// A local ESLint rule: no text a visitor reads is written in JSX. The store's words come from `app/locales/` through
// `t()` (§6.4, B-203), so a merchant's language is never mixed with English. Reported: JSX text with a letter in it, a
// string literal in a JSX expression, and the attributes a visitor or a screen reader meets — `alt`, `aria-label`,
// `aria-description`, `title` and `placeholder` — given as a literal with a letter. Symbols (`·`, `×`, `*`) are not
// words and pass.
const LETTER = /\p{L}/u;
const READ_ATTRIBUTES = new Set(['alt', 'aria-label', 'aria-description', 'title', 'placeholder']);

/** The string literals an expression can render: itself, or the branches of a `?:`, `&&` or `||`. */
function* literals(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') yield [node, node.value];
  else if (node.type === 'TemplateLiteral')
    yield [node, node.quasis.map((quasi) => quasi.value.cooked ?? '').join(' ')];
  else if (node.type === 'ConditionalExpression') yield* [...literals(node.consequent), ...literals(node.alternate)];
  else if (node.type === 'LogicalExpression') yield* [...literals(node.left), ...literals(node.right)];
}

/** @type {import('eslint').Rule.RuleModule} */
const noLiteralText = {
  meta: {
    type: 'problem',
    docs: {description: 'Text a visitor reads comes from the translations, not from JSX.'},
    messages: {literal: 'Text "{{text}}" is written in JSX: put it in app/locales and read it with t().'},
    schema: [],
  },
  create(context) {
    const report = (node, text) =>
      context.report({node, messageId: 'literal', data: {text: text.trim().replace(/\s+/g, ' ').slice(0, 40)}});
    const check = (expression) => {
      for (const [node, text] of literals(expression)) if (LETTER.test(text)) report(node, text);
    };
    return {
      JSXText(node) {
        if (LETTER.test(node.value)) report(node, node.value);
      },
      JSXExpressionContainer(node) {
        if (node.parent.type !== 'JSXAttribute') check(node.expression);
      },
      JSXAttribute(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : '';
        if (!READ_ATTRIBUTES.has(name) || !node.value) return;
        check(node.value.type === 'JSXExpressionContainer' ? node.value.expression : node.value);
      },
    };
  },
};

export default {rules: {'no-literal-text': noLiteralText}};
