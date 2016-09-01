export default {
  "defs": {
    "onEvents": {
      "type": "array",
      "items": {
        "allOf": [
          {
            "type": "object",
            "properties": {
              "events": {
                "oneOf": [
                  {"$ref": "#/refs/selector"},
                  {"$ref": "#/refs/signal"},
                  {"$ref": "#/defs/stream"}
                ]
              },
              "force": {"type": "boolean"}
            },
            "required": ["events"]
          },
          {
            "oneOf": [
              {
                "type": "object",
                "properties": {
                  "encode": {"type": "string"}
                },
                "required": ["encode"]
              },
              {
                "type": "object",
                "properties": {
                  "update": {
                    "oneOf": [
                      {"$ref": "#/refs/exprString"},
                      {"$ref": "#/refs/expr"},
                      {"$ref": "#/refs/signal"},
                      {
                        "type": "object",
                        "properties": {"value": {}},
                        "required": ["value"]
                      }
                    ]
                  }
                },
                "required": ["update"]
              }
            ]
          }
        ]
      }
    }
  }
};
