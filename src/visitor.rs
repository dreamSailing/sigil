// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

use swc_core::ecma::ast::*;
use swc_core::ecma::visit::{Fold, FoldWith};

pub struct JsxVisitor;

impl JsxVisitor {
    pub fn new() -> Self {
        Self
    }

    fn transform_jsx_element(&mut self, el: JSXElement) -> Expr {
        let is_component = match &el.opening.name {
            JSXElementName::Ident(ident) => {
                let name = &ident.sym;
                let first_char = name.chars().next().unwrap_or('a');
                first_char.is_ascii_uppercase()
            }
            JSXElementName::JSXMemberExpr(_) => true,
            JSXElementName::JSXNamespacedName(_) => false,
        };

        // Build tag expression
        let tag_expr: Box<Expr> = match &el.opening.name {
            JSXElementName::Ident(ident) => {
                if is_component {
                    Box::new(Expr::Ident(ident.clone()))
                } else {
                    Box::new(Expr::Lit(Lit::Str(Str {
                        value: ident.sym.clone(),
                        span: ident.span,
                        raw: None,
                    })))
                }
            }
            JSXElementName::JSXMemberExpr(member) => {
                Box::new(self.jsx_member_to_expr(member))
            }
            JSXElementName::JSXNamespacedName(_) => {
                Box::new(Expr::Lit(Lit::Str(Str {
                    value: "UnknownComponent".into(),
                    span: el.span,
                    raw: None,
                })))
            }
        };

        // Extract Props - separate regular props and spread props
        let mut regular_props: Vec<PropOrSpread> = Vec::new();
        let mut spread_exprs: Vec<Box<Expr>> = Vec::new();

        for attr in &el.opening.attrs {
            match attr {
                JSXAttrOrSpread::JSXAttr(a) => {
                    if let JSXAttrName::Ident(ident) = &a.name {
                        let key_str = ident.sym.to_string();
                        let key = PropName::Ident(Ident::new(key_str.into(), a.span));

                        let val: Box<Expr> = match &a.value {
                            Some(JSXAttrValue::Lit(Lit::Str(s))) => {
                                Box::new(Expr::Lit(Lit::Str(s.clone())))
                            }
                            Some(JSXAttrValue::JSXExprContainer(c)) => {
                                if let JSXExpr::Expr(e) = &c.expr {
                                    e.clone()
                                } else {
                                    continue;
                                }
                            }
                            _ => Box::new(Expr::Lit(Lit::Bool(Bool {
                                value: true,
                                span: el.span,
                            }))),
                        };

                        regular_props.push(PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                            key,
                            value: val,
                        }))));
                    }
                }
                JSXAttrOrSpread::SpreadElement(spread) => {
                    spread_exprs.push(spread.expr.clone());
                }
            }
        }

        // Build merged props object
        let props_obj: Box<Expr> = if spread_exprs.is_empty() {
            Box::new(Expr::Object(ObjectLit {
                span: el.span,
                props: regular_props,
            }))
        } else {
            // Object.assign({}, ...spreads, { regularProps })
            let mut args: Vec<ExprOrSpread> = vec![
                ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Object(ObjectLit {
                        span: el.span,
                        props: vec![],
                    })),
                },
            ];
            for expr in &spread_exprs {
                args.push(ExprOrSpread {
                    spread: None,
                    expr: expr.clone(),
                });
            }
            if !regular_props.is_empty() {
                args.push(ExprOrSpread {
                    spread: None,
                    expr: Box::new(Expr::Object(ObjectLit {
                        span: el.span,
                        props: regular_props,
                    })),
                });
            }
            Box::new(Expr::Call(CallExpr {
                span: el.span,
                callee: Callee::Expr(Box::new(Expr::Member(MemberExpr {
                    span: el.span,
                    obj: Box::new(Expr::Ident(Ident::new("Object".into(), el.span))),
                    prop: MemberProp::Ident(Ident::new("assign".into(), el.span)),
                }))),
                args,
                type_args: None,
            }))
        };

        // Extract Children
        let children: Vec<ExprOrSpread> = el
            .children
            .iter()
            .filter_map(|child| match child {
                JSXElementChild::JSXText(t) => {
                    let trimmed = t.raw.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(ExprOrSpread {
                            spread: None,
                            expr: Box::new(Expr::Lit(Lit::Str(Str {
                                value: trimmed.into(),
                                span: t.span,
                                raw: None,
                            }))),
                        })
                    }
                }
                JSXElementChild::JSXExprContainer(c) => {
                    if let JSXExpr::Expr(e) = &c.expr {
                        Some(ExprOrSpread {
                            spread: None,
                            expr: e.clone(),
                        })
                    } else {
                        None
                    }
                }
                JSXElementChild::JSXSpreadChild(c) => {
                    Some(ExprOrSpread {
                        spread: Some(Default::default()),
                        expr: c.expr.clone(),
                    })
                }
                _ => None,
            })
            .collect();

        // Build the call expression based on element type
        if !is_component {
            // HTML element: h(tag, props, ...children)
            Expr::Call(CallExpr {
                span: el.span,
                callee: Callee::Expr(Box::new(Expr::Ident(Ident::new("h".into(), el.span)))),
                args: [
                    vec![
                        ExprOrSpread { spread: None, expr: tag_expr },
                        ExprOrSpread { spread: None, expr: props_obj },
                    ],
                    children,
                ].concat(),
                type_args: None,
            })
        } else {
            // Component: Component(Object.assign(props, { children }))
            let mut final_props: Vec<Box<Expr>> = spread_exprs.to_vec();
            final_props.push(props_obj.clone());

            let merged_props: Box<Expr> = if final_props.len() == 1 {
                final_props.into_iter().next().unwrap()
            } else {
                let mut args: Vec<ExprOrSpread> = vec![
                    ExprOrSpread {
                        spread: None,
                        expr: Box::new(Expr::Object(ObjectLit {
                            span: el.span,
                            props: vec![],
                        })),
                    },
                ];
                for expr in final_props {
                    args.push(ExprOrSpread {
                        spread: None,
                        expr,
                    });
                }
                Box::new(Expr::Call(CallExpr {
                    span: el.span,
                    callee: Callee::Expr(Box::new(Expr::Member(MemberExpr {
                        span: el.span,
                        obj: Box::new(Expr::Ident(Ident::new("Object".into(), el.span))),
                        prop: MemberProp::Ident(Ident::new("assign".into(), el.span)),
                    }))),
                    args,
                    type_args: None,
                }))
            };

            // Add children to props
            if !children.is_empty() {
                if let Expr::Call(_) = &*merged_props {
                    // For Object.assign result, we need to add children separately
                    // This is handled by wrapping in another Object.assign
                    let children_expr: Box<Expr> = if children.len() == 1 {
                        children.into_iter().next().unwrap().expr
                    } else {
                        Box::new(Expr::Array(ArrayLit {
                            span: el.span,
                            elems: children.into_iter().map(Some).collect(),
                        }))
                    };
                    let children_prop = PropOrSpread::Prop(Box::new(Prop::KeyValue(KeyValueProp {
                        key: PropName::Ident(Ident::new("children".into(), el.span)),
                        value: children_expr,
                    })));
                    // Wrap in another Object.assign
                    let outer_props = Expr::Object(ObjectLit {
                        span: el.span,
                        props: vec![children_prop],
                    });
                    let final_merged = Box::new(Expr::Call(CallExpr {
                        span: el.span,
                        callee: Callee::Expr(Box::new(Expr::Member(MemberExpr {
                            span: el.span,
                            obj: Box::new(Expr::Ident(Ident::new("Object".into(), el.span))),
                            prop: MemberProp::Ident(Ident::new("assign".into(), el.span)),
                        }))),
                        args: vec![
                            ExprOrSpread { spread: None, expr: merged_props },
                            ExprOrSpread { spread: None, expr: Box::new(outer_props) },
                        ],
                        type_args: None,
                    }));
                    Expr::Call(CallExpr {
                        span: el.span,
                        callee: Callee::Expr(tag_expr),
                        args: vec![ExprOrSpread { spread: None, expr: final_merged }],
                        type_args: None,
                    })
                } else {
                    Expr::Call(CallExpr {
                        span: el.span,
                        callee: Callee::Expr(tag_expr),
                        args: vec![ExprOrSpread { spread: None, expr: merged_props }],
                        type_args: None,
                    })
                }
            } else {
                Expr::Call(CallExpr {
                    span: el.span,
                    callee: Callee::Expr(tag_expr),
                    args: vec![ExprOrSpread { spread: None, expr: merged_props }],
                    type_args: None,
                })
            }
        }
    }

    fn jsx_member_to_expr(&self, member: &JSXMemberExpr) -> Expr {
        let prop = Ident::new(member.prop.sym.clone(), member.prop.span);
        let span = member.prop.span;
        match &member.obj {
            JSXObject::Ident(ident) => {
                Expr::Member(MemberExpr {
                    span,
                    obj: Box::new(Expr::Ident(ident.clone())),
                    prop: MemberProp::Ident(prop),
                })
            }
            JSXObject::JSXMemberExpr(inner) => {
                let inner_expr = self.jsx_member_to_expr(inner);
                Expr::Member(MemberExpr {
                    span,
                    obj: Box::new(inner_expr),
                    prop: MemberProp::Ident(prop),
                })
            }
        }
    }

    fn transform_jsx_fragment(&self, frag: JSXFragment) -> Expr {
        let children: Vec<ExprOrSpread> = frag
            .children
            .iter()
            .filter_map(|child| match child {
                JSXElementChild::JSXText(t) => {
                    let trimmed = t.raw.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(ExprOrSpread {
                            spread: None,
                            expr: Box::new(Expr::Lit(Lit::Str(Str {
                                value: trimmed.into(),
                                span: t.span,
                                raw: None,
                            }))),
                        })
                    }
                }
                JSXElementChild::JSXExprContainer(c) => {
                    if let JSXExpr::Expr(e) = &c.expr {
                        Some(ExprOrSpread {
                            spread: None,
                            expr: e.clone(),
                        })
                    } else {
                        None
                    }
                }
                JSXElementChild::JSXSpreadChild(c) => {
                    Some(ExprOrSpread {
                        spread: Some(Default::default()),
                        expr: c.expr.clone(),
                    })
                }
                _ => None,
            })
            .collect();

        Expr::Call(CallExpr {
            span: frag.span,
            callee: Callee::Expr(Box::new(Expr::Ident(Ident::new("Fragment".into(), frag.span)))),
            args: children,
            type_args: None,
        })
    }
}

impl Fold for JsxVisitor {
    fn fold_expr(&mut self, e: Expr) -> Expr {
        // Handle JSX fragment
        if let Expr::JSXFragment(frag) = e {
            return self.transform_jsx_fragment(frag);
        }

        // Handle JSX element
        let e = e.fold_children_with(self);
        if let Expr::JSXElement(el) = e {
            return self.transform_jsx_element(*el);
        }
        e
    }

    fn fold_jsx_element(&mut self, el: JSXElement) -> JSXElement {
        // Prevent double processing
        el
    }

    fn fold_jsx_fragment(&mut self, frag: JSXFragment) -> JSXFragment {
        // Prevent double processing
        frag
    }
}
