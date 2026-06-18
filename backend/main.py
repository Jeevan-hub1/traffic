from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base
from init_db import init_db
from routers import (
    module1_quality,
    module2_detection,
    module3_violation,
    module4_lpr,
    module5_evidence,
    module6_analytics,
    module7_evaluation,
    module8_predictions,
    pipeline,
    assistant,
    command_center,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    init_db()
    yield


app = FastAPI(title="SafeVision AI Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(module1_quality.router, prefix="/api/quality", tags=["Module 1"])
app.include_router(module2_detection.router, prefix="/api/detection", tags=["Module 2"])
app.include_router(module3_violation.router, prefix="/api/violation", tags=["Module 3"])
app.include_router(module4_lpr.router, prefix="/api/lpr", tags=["Module 4"])
app.include_router(module5_evidence.router, prefix="/api/evidence", tags=["Module 5"])
app.include_router(module6_analytics.router, prefix="/api/analytics", tags=["Module 6"])
app.include_router(module7_evaluation.router, prefix="/api/evaluation", tags=["Module 7"])
app.include_router(module8_predictions.router, prefix="/api/predictions", tags=["Module 8"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["Pipeline"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["Assistant"])
app.include_router(command_center.router, prefix="/api/command-center", tags=["Command Center"])


@app.get("/")
def read_root():
    return {"status": "SafeVision Backend Active", "version": "1.0.0", "modules": 8}
